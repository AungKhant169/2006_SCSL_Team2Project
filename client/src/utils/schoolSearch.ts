import type { SortOrder } from '@/data/education'
import type { School } from '@/types/school'

export const PAGE_SIZE = 10

export interface SchoolQuery {
  /** Already-sanitised, lower-cased keyword (see parseSearchQuery); empty means no keyword. */
  term: string
  /** Governance type to keep, e.g. "Government-Aided"; empty keeps every type. */
  schoolType: string
  /** Farthest distance in km to keep; Infinity keeps every school. */
  maxKm: number
  sort: SortOrder
}

/** Keyword matches the school name or its acronym (REQ-1.1). */
function matchesTerm(school: School, term: string): boolean {
  if (!term) return true
  return school.name.toLowerCase().includes(term) || school.acronym.toLowerCase().includes(term)
}

/** Schools without a known distance sort after the others when ordering by distance. */
function byDistance(a: School, b: School): number {
  if (a.distanceKm === b.distanceKm) return a.name.localeCompare(b.name)
  if (a.distanceKm === null) return 1
  if (b.distanceKm === null) return -1
  return a.distanceKm - b.distanceKm
}

export function searchSchools(schools: School[], query: SchoolQuery): School[] {
  const matches = schools
    .filter((s) => matchesTerm(s, query.term))
    .filter((s) => !query.schoolType || s.type === query.schoolType)
    .filter(
      (s) => query.maxKm === Infinity || (s.distanceKm !== null && s.distanceKm <= query.maxKm),
    )

  return matches.sort((a, b) => {
    if (query.sort === 'dist') return byDistance(a, b)
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
