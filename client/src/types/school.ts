/** Education tier a school belongs to. Also identifies the transition stage that leads into it. */
export type TierId = 'preschool' | 'primary' | 'secondary' | 'postsec' | 'uni'

/** Tiers that can be browsed in the school directory (preschool has no directory records yet). */
export type DirectoryTierId = Exclude<TierId, 'preschool'>

export type CitizenshipId = 'sc' | 'pr' | 'intl'

export type FieldOfStudy = 'STEM' | 'Business' | 'Healthcare' | 'Arts'

export interface Tier {
  id: TierId
  label: string
  /** Name of the primary entry benchmark for the tier, e.g. "PSLE AL range". */
  benchmarkLabel: string
  benchmarkDescription: string
  courseHeading: string
  courseColumn: string
  /** Suffix shown after the citizenship caption, e.g. " per month". */
  feeUnit: string
}

export type FeeSchedule = Record<CitizenshipId, number>

export interface Course {
  name: string
  field: string
  fees: FeeSchedule
  miscFee: number
}

export interface BenchmarkPoint {
  year: string
  value: number
}

/** How a benchmark value is rendered for display. */
export type BenchmarkFormat =
  | { kind: 'ratio' }
  | { kind: 'alRange' }
  | { kind: 'cutoff'; scale: 'L1R5' | 'ELR2B2' }
  | { kind: 'gpaRange'; upper: number }

export interface BenchmarkSpec {
  format: BenchmarkFormat
  /** Largest value the benchmark scale can take; used to size history bars. */
  max: number
  /** True when a lower value means a more selective school. */
  inverse?: boolean
}

export interface FinancialAid {
  name: string
  note: string
}

export interface Scholarship {
  name: string
  source: string
  eligibility: string
}

export interface School {
  id: number
  tier: DirectoryTierId
  acronym: string
  name: string
  /** Governance type, e.g. "Government-Aided" or "Private". */
  type: string
  area: string
  address: string
  postal: string
  mrt: string
  bus: string
  /** Straight-line distance in km from the reference postal code. */
  distanceKm: number
  /** Fields of study offered (tertiary institutions only). */
  fields?: FieldOfStudy[]
  benchmark: BenchmarkSpec
  history: BenchmarkPoint[]
  courses: Course[]
  aid: FinancialAid[]
  scholarships: Scholarship[]
}
