/** Education tier a school belongs to. Also identifies the transition stage that leads into it. */
export type TierId = 'preschool' | 'primary' | 'secondary' | 'postsec' | 'uni'

/** Tiers that can be browsed in the school directory (preschool has no directory records yet). */
export type DirectoryTierId = Exclude<TierId, 'preschool'>

export type CitizenshipId = 'sc' | 'pr' | 'intl'

export interface Tier {
  id: TierId
  label: string
  /** Name of the primary entry benchmark for the tier, e.g. "PSLE T-score cut-off". */
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
  /** The year the figure is for, or "Latest" when the dataset does not say. */
  year: string
  value: number
}

/** How a benchmark value is rendered for display. */
export type BenchmarkFormat = { kind: 'places' } | { kind: 'tScore' }

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
  /** Numeric id that bookmarks, reviews and roadmaps refer to. */
  id: number
  /** Slug that addresses the school's profile page and endpoint. */
  key: string
  tier: DirectoryTierId
  /** Initials of the name, shown on the badge of a school without a logo. */
  acronym: string
  name: string
  /** Governance type, e.g. "Government-Aided" or "Independent". */
  type: string
  area: string
  address: string
  postal: string
  mrt: string
  bus: string
  latitude: number | null
  longitude: number | null
  /** Straight-line distance in km from the reference postal code; null until one is located. */
  distanceKm: number | null
  /** The tier's entry benchmark, or null when the dataset has none for this school. */
  benchmark: BenchmarkSpec | null
  history: BenchmarkPoint[]
  /*
   * The school dataset carries no fees, financial aid or scholarships, so these stay empty and
   * the profile page says "Not available" (REQ-1.10) until a source for them exists.
   */
  courses: Course[]
  aid: FinancialAid[]
  scholarships: Scholarship[]
}

/** A CCA category and the clubs offered under it. */
export interface CcaGroup {
  category: string
  names: string[]
}

/** A named programme with its domain, e.g. an Applied Learning Programme. */
export interface ProgrammeInfo {
  kind: string
  domain: string
  title: string
}

/** Everything the school profile page shows; the directory only needs {@link School}. */
export interface SchoolProfile extends School {
  website: string
  phone: string
  email: string
  principal: string
  gender: string
  /** Plain-language flags such as "Autonomous" or "Integrated Programme". */
  features: string[]
  programmes: ProgrammeInfo[]
  moeProgrammes: string[]
  subjects: string[]
  ccas: CcaGroup[]
}
