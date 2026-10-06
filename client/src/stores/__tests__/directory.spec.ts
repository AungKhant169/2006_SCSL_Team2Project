import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_POSTAL, useDirectoryStore } from '../directory'

describe('directory store (UC-1.1)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts on the primary tier with every filter at its default', () => {
    const d = useDirectoryStore()
    expect(d.tier).toBe('primary')
    expect([d.query, d.gov, d.field, d.distance, d.sort]).toEqual(['', 'All', 'All', 'any', 'az'])
    expect(d.postal).toBe(DEFAULT_POSTAL)
    expect(d.matches).toHaveLength(4)
    expect(d.currentPage).toBe(1)
  })

  it('switching tier swaps the result set and drops the field filter', () => {
    const d = useDirectoryStore()
    d.tier = 'uni'
    d.field = 'Healthcare'
    expect(d.matches.map((s) => s.acronym)).toEqual(['NUS'])
    d.tier = 'postsec'
    expect(d.field).toBe('All')
    expect(d.matches).toHaveLength(5)
    expect(d.isTertiary).toBe(true)
    d.tier = 'secondary'
    expect(d.isTertiary).toBe(false)
  })

  it('filters by sanitised keyword and reports input errors without searching', () => {
    const d = useDirectoryStore()
    d.query = 'r'
    expect(d.queryError).toMatch(/at least 2 characters/)
    expect(d.matches).toHaveLength(4)

    d.query = 'rosyth'
    expect(d.queryError).toBe('')
    expect(d.matches.map((s) => s.name)).toEqual(['Rosyth School'])

    d.query = '<script>'
    expect(d.queryError).toMatch(/Unsupported characters/)
    expect(d.matches).toEqual([])
  })

  it('combines governance, distance and sort', () => {
    const d = useDirectoryStore()
    d.tier = 'postsec'
    d.gov = 'Private'
    d.distance = '2'
    expect(d.matches.map((s) => s.acronym)).toEqual(['EBA'])
    d.gov = 'Public/Government'
    expect(d.matches).toEqual([])
    d.distance = 'any'
    d.sort = 'dist'
    expect(d.matches[0]?.acronym).toBe('HCI')
  })

  it('returns to the first page whenever a criterion changes', () => {
    const d = useDirectoryStore()
    d.nextPage()
    expect(d.currentPage).toBe(1) // only one page of results exists
    d.query = 'ro'
    expect(d.currentPage).toBe(1)
  })

  it('page navigation is clamped to the available pages', () => {
    const d = useDirectoryStore()
    d.previousPage()
    d.nextPage()
    expect(d.currentPage).toBe(1)
    expect(d.pageCount).toBe(1)
  })

  it('resetFilters restores defaults but keeps the tier and reference postal code', () => {
    const d = useDirectoryStore()
    d.tier = 'uni'
    d.setPostal('119077')
    d.query = 'nus'
    d.gov = 'Private'
    d.field = 'STEM'
    d.distance = '2'
    d.sort = 'za'
    d.resetFilters()
    expect([d.query, d.gov, d.field, d.distance, d.sort]).toEqual(['', 'All', 'All', 'any', 'az'])
    expect(d.tier).toBe('uni')
    expect(d.postal).toBe('119077')
    expect(d.matches).toHaveLength(4)
  })

  it('keeps only digits in the reference postal code and knows when it is usable', () => {
    const d = useDirectoryStore()
    d.setPostal('55a6-00 99')
    expect(d.postal).toBe('556009')
    expect(d.hasPostal).toBe(true)
    d.setPostal('123')
    expect(d.hasPostal).toBe(false)
  })
})
