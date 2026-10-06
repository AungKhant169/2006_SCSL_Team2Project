import type { DistanceFilter, FieldFilter, GovernanceFilter, SortOrder } from '@/data/education'
import type { DirectoryTierId, School } from '@/types/school'

export const PAGE_SIZE = 10

export interface SchoolQuery {
  tier: DirectoryTierId
  /** Already-sanitised, lower-cased keyword (see parseSearchQuery); empty means no keyword. */
  term: string
  gov: GovernanceFilter
  field: FieldFilter
  distance: DistanceFilter
  sort: SortOrder
}

/** Keyword matches the school name, acronym or any course / programme title (REQ-1.1). */
function matchesTerm(school: School, term: string): boolean {
  if (!term) return true
  return (
    school.name.toLowerCase().includes(term) ||
    school.acronym.toLowerCase().includes(term) ||
    school.courses.some((c) => c.name.toLowerCase().includes(term))
  )
}

function matchesGovernance(school: School, gov: GovernanceFilter): boolean {
  if (gov === 'All') return true
  return gov === 'Private' ? school.type === 'Private' : school.type !== 'Private'
}

export function searchSchools(schools: School[], query: SchoolQuery): School[] {
  const maxKm = query.distance === 'any' ? Infinity : Number(query.distance)

  const matches = schools
    .filter((s) => s.tier === query.tier)
    .filter((s) => matchesTerm(s, query.term))
    .filter((s) => matchesGovernance(s, query.gov))
    .filter((s) => query.field === 'All' || !s.fields || s.fields.includes(query.field))
    .filter((s) => s.distanceKm <= maxKm)

  return matches.sort((a, b) => {
    if (query.sort === 'dist') return a.distanceKm - b.distanceKm
    if (query.sort === 'za') return b.name.localeCompare(a.name)
    return a.name.localeCompare(b.name)
  })
}

export interface Page<T> {
  items: T[]
  /** Current page after clamping to the available range (1-based). */
  page: number
  pageCount: number
}

export function paginate<T>(items: T[], requestedPage: number, pageSize = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageCount }
}
