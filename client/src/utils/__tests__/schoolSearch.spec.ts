import { describe, expect, it } from 'vitest'
import { makeSchool } from '@/test/fixtures'
import type { School } from '@/types/school'
import { paginate, searchSchools } from '../schoolSearch'
import type { SchoolQuery } from '../schoolSearch'

const SCHOOLS: School[] = [
  makeSchool({
    id: 1,
    name: 'Nanyang Primary School',
    acronym: 'NP',
    type: 'Government-Aided',
    distanceKm: 4.6,
  }),
  makeSchool({ id: 2, name: 'Rosyth School', acronym: 'RS', distanceKm: 1.4 }),
  makeSchool({
    id: 3,
    name: 'Tao Nan School',
    acronym: 'TNS',
    type: 'Government-Aided',
    distanceKm: 9.8,
  }),
  makeSchool({ id: 4, name: 'Zhonghua Primary School', acronym: 'ZP', distanceKm: 0.8 }),
  makeSchool({ id: 5, name: 'Far Away School', acronym: 'FAS', distanceKm: null }),
]

const query = (overrides: Partial<SchoolQuery> = {}): SchoolQuery => ({
  term: '',
  schoolType: '',
  maxKm: Infinity,
  sort: 'az',
  ...overrides,
})
const names = (q: Partial<SchoolQuery>) => searchSchools(SCHOOLS, query(q)).map((s) => s.name)

describe('searchSchools', () => {
  describe('keyword (REQ-1.1)', () => {
    it('matches the official name', () => {
      expect(names({ term: 'rosyth' })).toEqual(['Rosyth School'])
    })

    it('matches the acronym', () => {
      expect(names({ term: 'tns' })).toEqual(['Tao Nan School'])
    })

    it('yields no results when nothing matches', () => {
      expect(names({ term: 'zzzz' })).toEqual([])
    })
  })

  describe('school type (REQ-1.3)', () => {
    it('keeps only the chosen governance type', () => {
      expect(names({ schoolType: 'Government-Aided' })).toEqual([
        'Nanyang Primary School',
        'Tao Nan School',
      ])
    })

    it('an empty type keeps every school', () => {
      expect(names({ schoolType: '' })).toHaveLength(5)
    })
  })

  describe('distance (REQ-1.5)', () => {
    it('keeps schools within the radius (inclusive)', () => {
      expect(names({ maxKm: 1 })).toEqual(['Zhonghua Primary School'])
      expect(names({ maxKm: 1.4 })).toEqual(['Rosyth School', 'Zhonghua Primary School'])
      expect(names({ maxKm: 5 })).toHaveLength(3)
    })

    it('drops schools whose distance is unknown once a radius is set', () => {
      expect(names({ maxKm: 100 })).not.toContain('Far Away School')
      expect(names({ maxKm: Infinity })).toContain('Far Away School')
    })

    it('can produce an empty result', () => {
      expect(names({ maxKm: 0.1 })).toEqual([])
    })
  })

  describe('sorting (REQ-1.6)', () => {
    it('sorts A–Z and Z–A', () => {
      expect(names({ sort: 'az' })[0]).toBe('Far Away School')
      expect(names({ sort: 'za' })[0]).toBe('Zhonghua Primary School')
    })

    it('sorts by distance, nearest first, with unlocated schools last', () => {
      expect(searchSchools(SCHOOLS, query({ sort: 'dist' })).map((s) => s.distanceKm)).toEqual([
        0.8,
        1.4,
        4.6,
        9.8,
        null,
      ])
    })
  })

  it('combines filters', () => {
    expect(names({ schoolType: 'Government-Aided', maxKm: 5, term: 'nan' })).toEqual([
      'Nanyang Primary School',
    ])
  })

  it('does not mutate the source list', () => {
    const before = SCHOOLS.map((s) => s.id)
    searchSchools(SCHOOLS, query({ sort: 'za' }))
    expect(SCHOOLS.map((s) => s.id)).toEqual(before)
  })
})

describe('paginate (10 per page)', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('slices ten items per page', () => {
    expect(paginate(items, 1)).toMatchObject({ page: 1, pageCount: 3 })
    expect(paginate(items, 1).items).toHaveLength(10)
    expect(paginate(items, 3).items).toEqual([21, 22, 23, 24, 25])
  })

  it('clamps out-of-range pages', () => {
    expect(paginate(items, 9).page).toBe(3)
    expect(paginate(items, 0).page).toBe(1)
  })

  it('always reports at least one page', () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1 })
  })
})
