import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { DEFAULT_POSTAL, useDirectoryStore } from '../directory'

describe('directory store (UC-1.1)', () => {
  let api: FakeApi

  beforeEach(() => {
    setActivePinia(createPinia())
    api = stubApi()
  })

  /** A store with the primary tier loaded and the default postal code located. */
  async function loaded() {
    const d = useDirectoryStore()
    await d.load()
    await flushPromises()
    return d
  }

  it('starts on the primary tier with every filter at its default', () => {
    const d = useDirectoryStore()
    expect(d.tier).toBe('primary')
    expect([d.query, d.schoolType, d.distance, d.sort]).toEqual(['', '', 'any', 'az'])
    expect(d.postal).toBe(DEFAULT_POSTAL)
    expect(d.status).toBe('loading')
    expect(d.matches).toEqual([])
    expect(d.currentPage).toBe(1)
  })

  describe('loading the schools', () => {
    it('fetches the tier’s schools once, by stage', async () => {
      const d = await loaded()
      expect(d.status).toBe('ready')
      expect(d.matches.map((s) => s.name)).toEqual([
        'Nanyang Primary School',
        'Rosyth School',
        'Tao Nan School',
        'Zhonghua Primary School',
      ])
      await d.load()
      expect(api.callsTo('GET /school-api')).toHaveLength(1)
      expect(api.callsTo('GET /school-api')[0]?.query.get('stage')).toBe('primary')
    })

    it('shares one request between callers asking at the same time', async () => {
      const d = useDirectoryStore()
      await Promise.all([d.load(), d.load(), d.loadTier('primary')])
      expect(api.callsTo('GET /school-api')).toHaveLength(1)
    })

    it('reports a failed load and succeeds when retried', async () => {
      api.override('GET /school-api', () => {
        throw new TypeError('Failed to fetch')
      })
      const d = useDirectoryStore()
      await d.load()
      expect(d.status).toBe('error')

      api.restore('GET /school-api')
      await d.load()
      expect(d.status).toBe('ready')
    })

    it('forgets the schools when asked, so the next load fetches again', async () => {
      const d = await loaded()
      d.clearCatalogue()
      expect(d.status).toBe('loading')
      await d.load()
      expect(api.callsTo('GET /school-api')).toHaveLength(2)
    })
  })

  it('switching tier loads its schools and drops the school type', async () => {
    const d = await loaded()
    d.schoolType = 'Government-Aided'
    d.tier = 'secondary'
    expect(d.schoolType).toBe('')
    await flushPromises()
    expect(d.matches.map((s) => s.name)).toEqual([
      'Bukit Panjang Govt. High School',
      "Cedar Girls' Secondary School",
      'Raffles Institution',
      "St. Gabriel's Secondary School",
    ])
    d.tier = 'postsec'
    await flushPromises()
    expect(d.matches.map((s) => s.name)).toEqual([
      'Eunoia Junior College',
      'Raffles Institution',
      'Temasek Junior College',
    ])
  })

  it('knows when a tier has no schools at all', async () => {
    const d = await loaded()
    expect(d.tierEmpty).toBe(false)
    d.tier = 'uni'
    await flushPromises()
    expect(d.status).toBe('ready')
    expect(d.tierEmpty).toBe(true)
    expect(d.matches).toEqual([])
  })

  it('filters by sanitised keyword and reports input errors without searching', async () => {
    const d = await loaded()
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

  it('offers the school types of the tier and filters by one', async () => {
    const d = await loaded()
    expect(d.schoolTypes).toEqual(['Government', 'Government-Aided'])
    d.schoolType = 'Government-Aided'
    expect(d.matches.map((s) => s.name)).toEqual(['Nanyang Primary School', 'Tao Nan School'])
  })

  describe('distance from the reference postal code', () => {
    it('adds a distance to every school once the postal code is placed', async () => {
      const d = await loaded()
      expect(d.hasPostal).toBe(true)
      expect(d.matches.every((s) => s.distanceKm !== null)).toBe(true)
    })

    it('keeps schools within the radius and sorts nearest first', async () => {
      const d = await loaded()
      d.sort = 'dist'
      expect(d.matches.map((s) => s.name)[0]).toBe('Zhonghua Primary School')
      d.distance = '2'
      expect(d.matches.map((s) => s.name)).toEqual(['Zhonghua Primary School', 'Rosyth School'])
      d.distance = '1'
      expect(d.matches.map((s) => s.name)).toEqual(['Zhonghua Primary School'])
    })

    it('ignores the radius while no postal code is placed', async () => {
      const d = await loaded()
      d.setPostal('12')
      expect(d.hasPostal).toBe(false)
      d.distance = '1'
      expect(d.matches).toHaveLength(4)
      expect(d.matches.every((s) => s.distanceKm === null)).toBe(true)
    })

    it('says when a complete postal code cannot be placed', async () => {
      const d = await loaded()
      d.setPostal('990000')
      await flushPromises()
      expect(d.hasPostal).toBe(false)
      expect(d.postalUnknown).toBe(true)
      d.setPostal('99')
      expect(d.postalUnknown).toBe(false)
    })

    it('measures from another postal code once it is placed', async () => {
      const d = await loaded()
      const home = d.matches.find((s) => s.name === 'Zhonghua Primary School')!.distanceKm
      d.setPostal('600000')
      await flushPromises()
      const jurong = d.matches.find((s) => s.name === 'Zhonghua Primary School')!.distanceKm
      expect(jurong).toBeGreaterThan(home!)
    })
  })

  it('returns to the first page whenever a criterion changes', async () => {
    const d = await loaded()
    d.nextPage()
    expect(d.currentPage).toBe(1) // only one page of results exists
    d.query = 'ro'
    expect(d.currentPage).toBe(1)
  })

  it('page navigation is clamped to the available pages', async () => {
    const d = await loaded()
    d.previousPage()
    d.nextPage()
    expect(d.currentPage).toBe(1)
    expect(d.pageCount).toBe(1)
  })

  it('resetFilters restores defaults but keeps the tier and reference postal code', async () => {
    const d = await loaded()
    d.tier = 'secondary'
    await flushPromises()
    d.setPostal('600000')
    d.query = 'raffles'
    d.schoolType = 'Independent'
    d.distance = '2'
    d.sort = 'za'
    d.resetFilters()
    expect([d.query, d.schoolType, d.distance, d.sort]).toEqual(['', '', 'any', 'az'])
    expect(d.tier).toBe('secondary')
    expect(d.postal).toBe('600000')
    expect(d.matches).toHaveLength(4)
  })

  it('keeps only digits in the reference postal code', () => {
    const d = useDirectoryStore()
    d.setPostal('55a6-00 99')
    expect(d.postal).toBe('556009')
    d.setPostal('123')
    expect(d.postal).toBe('123')
  })
})
