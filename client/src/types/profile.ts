import type { TierId } from './school'

/** The upcoming transition a student is planning for. Shares ids with school tiers. */
export interface EducationLevel {
  id: TierId
  /** Short "from → to" caption. */
  tag: string
  label: string
  /** Guidance shown above the academic result fields. */
  hint: string
  /** Where the student currently is, shown as the roadmap starting point. */
  from: string
}

export type PrimaryResult = 'None' | 'Kindergarten completion'
