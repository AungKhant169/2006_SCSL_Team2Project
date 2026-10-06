import { describe, expect, it } from 'vitest'
import { SCHOOLS } from '@/data/schools'
import { paginate, searchSchools } from '../schoolSearch'
import type { SchoolQuery } from '../schoolSearch'

const query = (overrides: Partial<SchoolQuery> = {}): SchoolQuery => ({
  tier: 'primary',
  term: '',
  gov: 'All',
  field: 'All',
  distance: 'any',
  sort: 'az',
  ...overrides,
})
const names = (q: Partial<SchoolQuery>) => searchSchools(SCHOOLS, query(q)).map((s) => s.name)

describe('searchSchools', () => {
  it('returns only schools in the selected tier (REQ-1.2)', () => {
    expect(names({ tier: 'primary' })).toHaveLength(4)
    expect(names({ tier: 'secondary' })).toHaveLength(4)
    expect(names({ tier: 'postsec' })).toHaveLength(5)
    expect(names({ tier: 'uni' })).toHaveLength(4)
  })

  describe('keyword (REQ-1.1)', () => {
    it('matches the official name', () => {
      expect(names({ term: 'rosyth' })).toEqual(['Rosyth School'])
    })

    it('matches the acronym', () => {
      expect(names({ tier: 'uni', term: 'nus' })).toEqual(['National University of Singapore'])
    })

    it('matches course titles', () => {
      expect(names({ tier: 'postsec', term: 'cybersecurity' })).toEqual(['Ngee Ann Polytechnic'])
      expect(names({ tier: 'uni', term: 'bachelor of computing' })).toEqual([
        'National University of Singapore',
      ])
    })

    it('yields no results when nothing matches', () => {
      expect(names({ term: 'zzzz' })).toEqual([])
    })
  })

  describe('governance (REQ-1.3)', () => {
    it('Private only keeps private institutions', () => {
      expect(names({ tier: 'postsec', gov: 'Private' })).toEqual(['Eastbridge Academy (Private)'])
    })

    it('Public/Government keeps everything that is not private', () => {
      const result = names({ tier: 'postsec', gov: 'Public/Government' })
      expect(result).not.toContain('Eastbridge Academy (Private)')
      expect(result).toHaveLength(4)
    })
  })

  describe('field of study (REQ-1.4)', () => {
    it('keeps institutions offering the field', () => {
      const healthcare = names({ tier: 'postsec', field: 'Healthcare' })
      expect(healthcare).toEqual(['Ngee Ann Polytechnic', 'Singapore Polytechnic'])
    })

    it('does not filter tiers that have no field data', () => {
      expect(names({ tier: 'primary', field: 'STEM' })).toHaveLength(4)
    })
  })

  describe('distance (REQ-1.5)', () => {
    it('keeps schools within the radius (inclusive)', () => {
      expect(names({ distance: '1' })).toEqual(['Zhonghua Primary School'])
      expect(names({ distance: '2' })).toEqual(['Rosyth School', 'Zhonghua Primary School'])
      expect(names({ distance: '5' })).toHaveLength(3)
    })

    it('can produce an empty result', () => {
      expect(names({ tier: 'uni', distance: '1' })).toEqual([])
    })
  })

  describe('sorting (REQ-1.6)', () => {
    it('sorts A–Z and Z–A', () => {
      expect(names({ sort: 'az' })[0]).toBe('Nanyang Primary School')
      expect(names({ sort: 'za' })[0]).toBe('Zhonghua Primary School')
    })

    it('sorts by distance, nearest first', () => {
      expect(searchSchools(SCHOOLS, query({ sort: 'dist' })).map((s) => s.distanceKm)).toEqual([
        0.8, 1.4, 4.6, 9.8,
      ])
    })
  })

  it('combines filters', () => {
    expect(
      names({ tier: 'uni', gov: 'Public/Government', field: 'Healthcare', term: 'med' }),
    ).toEqual(['National University of Singapore'])
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
