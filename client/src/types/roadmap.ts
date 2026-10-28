import type { TierId } from './school'

export type PlanSource = 'Rule-Based Plan' | 'AI-Generated Plan'

/** The single roadmap a student account may keep. Choices are school ids in preference order. */
export interface SavedRoadmap {
  stage: TierId
  source: PlanSource
  choices: number[]
}

/** One step of a roadmap as shown to the user. */
export interface PlanNode {
  step: number
  label: string
  /** Display name of the school, or "Not available" for a stale choice. */
  schoolName: string
  detail: string
  /** Where the school is, or null when it is not available or the dataset has no position for it. */
  latitude: number | null
  longitude: number | null
}

/** Where a plan is in being fetched from the server. */
export type PlanStatus = 'idle' | 'loading' | 'ready' | 'error'
