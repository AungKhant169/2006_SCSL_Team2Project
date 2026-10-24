import type { PlanSource, SavedRoadmap } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { authorizedRequest } from './authorizedRequest'
import { ApiError } from './http'
import { toSchool } from './schoolService'
import type { SchoolSummaryPayload } from './schoolService'

/** PERF-7 / REQ-3.7: the AI plan must arrive within five seconds or it is treated as failed. */
export const AI_TIMEOUT_MS = 5000

/** What a plan is generated from. */
export interface PlanRequest {
  stage: TierId
  postal: string
  /** The student's previous academic score for the stage, when they entered one. */
  score: number | null
}

/** School ids in preference order, and the details of those schools. */
export interface RoadmapPlan {
  choices: number[]
  schools: School[]
}

export interface StoredRoadmap extends RoadmapPlan {
  stage: TierId
  source: PlanSource
}

interface PlanPayload {
  choices: number[]
  schools: SchoolSummaryPayload[]
}

interface RoadmapPayload extends PlanPayload {
  stage: TierId
  source: PlanSource
}

/** A school is described by the stage the plan is for: a school can span several, each with its own entry figures. */
const toPlan = (payload: PlanPayload, stage: TierId): RoadmapPlan => ({
  choices: payload.choices,
  schools: payload.schools.map((school) =>
    toSchool(school, stage === 'preschool' ? undefined : stage),
  ),
})

const toStored = (payload: RoadmapPayload): StoredRoadmap => ({
  ...toPlan(payload, payload.stage),
  stage: payload.stage,
  source: payload.source,
})

const toBody = ({ stage, postal, score }: PlanRequest) => ({
  stage,
  postal,
  previous_academic_score: score,
})

/** The rule-based plan: the server ranks the stage's schools by the official entry rules. */
export async function generateRulePlan(request: PlanRequest): Promise<RoadmapPlan> {
  return toPlan(
    await authorizedRequest<PlanPayload>('/roadmap/generate-rule-roadmap', {
      method: 'POST',
      body: toBody(request),
    }),
    request.stage,
  )
}

/** The AI plan. Rejects on an error, or when it takes longer than the timeout (five seconds by default). */
export async function generateAiPlan(
  request: PlanRequest,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<RoadmapPlan> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return toPlan(
      await authorizedRequest<PlanPayload>('/roadmap/generate-ai-roadmap', {
        method: 'POST',
        body: toBody(request),
        signal: controller.signal,
      }),
      request.stage,
    )
  } finally {
    clearTimeout(timer)
  }
}

/** The account's saved roadmap, or null when it has none. */
export async function fetchSavedRoadmap(): Promise<StoredRoadmap | null> {
  try {
    return toStored(await authorizedRequest<RoadmapPayload>('/roadmap'))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Stores the roadmap, replacing any existing one (REQ-3.10). */
export async function saveRoadmap(roadmap: SavedRoadmap): Promise<StoredRoadmap> {
  return toStored(
    await authorizedRequest<RoadmapPayload>('/roadmap', { method: 'PUT', body: roadmap }),
  )
}

/** Changes the school choices of the saved roadmap (REQ-3.14). */
export async function editSavedRoadmap(choices: number[]): Promise<StoredRoadmap> {
  return toStored(
    await authorizedRequest<RoadmapPayload>('/roadmap', { method: 'PATCH', body: { choices } }),
  )
}

export function deleteSavedRoadmap(): Promise<void> {
  return authorizedRequest<void>('/roadmap', { method: 'DELETE' })
}
