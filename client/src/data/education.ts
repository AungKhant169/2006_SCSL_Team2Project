import type { EducationLevel } from '@/types/profile'
import type { CitizenshipId, DirectoryTierId, Tier, TierId } from '@/types/school'

export const TIERS: Tier[] = [
  {
    id: 'preschool',
    label: 'Preschool',
    benchmarkLabel: 'Places (K1 intake)',
    benchmarkDescription: 'Indicative K1 intake places per centre.',
    courseHeading: 'Programmes',
    courseColumn: 'Programme',
    feeUnit: ' per month',
  },
  {
    id: 'primary',
    label: 'Primary',
    benchmarkLabel: 'P1 Phase 2C ratio',
    benchmarkDescription:
      'Applicants per vacancy at Phase 2C. Ratios above 1.0 indicate balloting.',
    courseHeading: 'Programmes',
    courseColumn: 'Programme',
    feeUnit: ' per month',
  },
  {
    id: 'secondary',
    label: 'Secondary',
    benchmarkLabel: 'PSLE AL range',
    benchmarkDescription:
      'PSLE Achievement Level aggregate of the last student posted (lower is more selective).',
    courseHeading: 'Subject combinations',
    courseColumn: 'Track / combination',
    feeUnit: ' per month',
  },
  {
    id: 'postsec',
    label: 'Post-Secondary',
    benchmarkLabel: 'JAE cut-off',
    benchmarkDescription:
      'JAE cut-off points: L1R5 for Junior Colleges, ELR2B2 for Polytechnics and ITE.',
    courseHeading: 'Courses',
    courseColumn: 'Course / diploma',
    feeUnit: ' per year',
  },
  {
    id: 'uni',
    label: 'University',
    benchmarkLabel: 'IGP GPA (10th–90th)',
    benchmarkDescription:
      'Indicative Grade Profile: polytechnic GPA of the 10th and 90th percentile admitted.',
    courseHeading: 'Degree programmes',
    courseColumn: 'Degree',
    feeUnit: ' per year',
  },
]

export const DIRECTORY_TIER_IDS: DirectoryTierId[] = ['primary', 'secondary', 'postsec', 'uni']

export const DIRECTORY_TIERS: Tier[] = TIERS.filter((t) =>
  (DIRECTORY_TIER_IDS as TierId[]).includes(t.id),
)

export function getTier(id: TierId): Tier {
  const tier = TIERS.find((t) => t.id === id)
  if (!tier) throw new Error(`Unknown tier: ${id}`)
  return tier
}

export const LEVELS: EducationLevel[] = [
  {
    id: 'preschool',
    tag: 'No school → Preschool',
    label: 'Preschool placement',
    hint: 'No prior results are required for preschool placement.',
    from: 'No school (current)',
  },
  {
    id: 'primary',
    tag: 'Preschool → Primary',
    label: 'P1 Registration',
    hint: 'No prior results are required for P1 Registration.',
    from: 'Preschool (current)',
  },
  {
    id: 'secondary',
    tag: 'Primary → Secondary',
    label: 'S1 Posting',
    hint: 'Enter your PSLE Achievement Level aggregate.',
    from: 'Primary school (current)',
  },
  {
    id: 'postsec',
    tag: 'Secondary → Post-Secondary',
    label: 'JC / Polytechnic / ITE',
    hint: 'Enter either or both O-Level aggregates.',
    from: 'Secondary school (current)',
  },
  {
    id: 'uni',
    tag: 'Post-Secondary → University',
    label: 'Autonomous University',
    hint: 'Enter your polytechnic GPA or A-Level rank points.',
    from: 'Post-secondary (current)',
  },
]

export function getLevel(id: TierId): EducationLevel {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Unknown education level: ${id}`)
  return level
}

export const CITIZENSHIPS: { id: CitizenshipId; label: string; shortLabel: string }[] = [
  { id: 'sc', label: 'Singapore Citizen', shortLabel: 'Singapore Citizen' },
  { id: 'pr', label: 'Permanent Resident', shortLabel: 'Permanent Resident' },
  { id: 'intl', label: 'International Student', shortLabel: 'International' },
]

export const GOVERNANCE_OPTIONS = ['All', 'Public/Government', 'Private'] as const
export type GovernanceFilter = (typeof GOVERNANCE_OPTIONS)[number]

export const FIELD_OPTIONS = [
  { value: 'All', label: 'All fields' },
  { value: 'STEM', label: 'STEM' },
  { value: 'Business', label: 'Business' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Arts', label: 'Arts & Humanities' },
] as const
export type FieldFilter = (typeof FIELD_OPTIONS)[number]['value']

export const DISTANCE_OPTIONS = [
  { value: 'any', label: 'Any distance' },
  { value: '1', label: 'Within 1 km' },
  { value: '2', label: 'Within 2 km' },
  { value: '5', label: 'Within 5 km' },
] as const
export type DistanceFilter = (typeof DISTANCE_OPTIONS)[number]['value']

export const SORT_OPTIONS = [
  { value: 'az', label: 'Name A–Z' },
  { value: 'za', label: 'Name Z–A' },
  { value: 'dist', label: 'Distance (nearest first)' },
] as const
export type SortOrder = (typeof SORT_OPTIONS)[number]['value']
