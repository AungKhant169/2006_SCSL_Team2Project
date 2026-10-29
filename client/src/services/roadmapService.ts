import type { PlanSource, RuleSort, SavedRoadmap } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { authorizedRequest } from './authorizedRequest'
import { ApiError } from './http'
import { toSchool } from './schoolService'
import type { SchoolSummaryPayload } from './schoolService'

/** PERF-7 / REQ-3.7: the AI plan must arrive within fifteen seconds or it is treated as failed. */
export const AI_TIMEOUT_MS = 15000

/** What a plan is generated from. */
export interface PlanRequest {
  stage: TierId
  postal: string
  /** The student's previous academic score for the stage, when they entered one. */
  score: number | null
}

/** What the rule-based plan is generated from: the same as any plan, and how to rank. */
export interface RulePlanRequest extends PlanRequest {
  sortBy: RuleSort
  /** Schools further than this many km from the postal code are left out. null for no limit. */
  maxDistanceKm: number | null
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

/** The rule-based plan: the server ranks the stage's schools by distance or by grade. */
export async function generateRulePlan(request: RulePlanRequest): Promise<RoadmapPlan> {
  return toPlan(
    await authorizedRequest<PlanPayload>('/roadmap/generate-rule-roadmap', {
      method: 'POST',
      body: { ...toBody(request), sort_by: request.sortBy, max_distance_km: request.maxDistanceKm },
    }),
    request.stage,
  )
}

/** The AI plan. Rejects on an error, or when it takes longer than the timeout (fifteen seconds by default). */
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
