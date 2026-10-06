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

/** One numeric academic result input on the profile form. */
export interface ResultField {
  /** Which profile score the input edits. */
  key: 'scoreA' | 'scoreB'
  label: string
  placeholder: string
  hint?: string
  inputmode: 'numeric' | 'decimal'
}
