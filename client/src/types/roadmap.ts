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
}

export type AiStatus = 'idle' | 'loading' | 'ready' | 'error'
