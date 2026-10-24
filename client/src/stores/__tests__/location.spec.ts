import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { HOME, SCHOOLS } from '@/test/fixtures'
import { makeSchool } from '@/test/fixtures'
import { jsonResponse } from '@/test/fakeApi'
import { distanceKm } from '@/utils/distance'
import { useLocationStore } from '../location'

describe('location store', () => {
  let api: FakeApi

  beforeEach(() => {
    setActivePinia(createPinia())
    api = stubApi()
  })

  it('places a postal code once and remembers it', async () => {
    const location = useLocationStore()
    expect(location.originOf('556000')).toBeNull()
    await location.locate('556000')
    expect(location.originOf('556000')).toMatchObject(HOME)
    await location.locate('556000')
    expect(api.callsTo('GET /location/556000')).toHaveLength(1)
  })

  it('shares one request between callers asking at the same time', async () => {
    const location = useLocationStore()
    await Promise.all([location.locate('556000'), location.locate('556000')])
    expect(api.callsTo('GET /location/556000')).toHaveLength(1)
  })

  it('remembers a postal code the server cannot place, and says so', async () => {
    const location = useLocationStore()
    expect(location.isUnplaced('990000')).toBe(false)
    await location.locate('990000')
    expect(location.originOf('990000')).toBeNull()
    expect(location.isUnplaced('990000')).toBe(true)
    await location.locate('990000')
    expect(api.callsTo('GET /location/990000')).toHaveLength(1)
  })

  it('ignores anything that is not a complete postal code', async () => {
    const location = useLocationStore()
    await location.locate('5560')
    await location.locate('')
    expect(api.fetch).not.toHaveBeenCalled()
  })

  it('tries again later when the server could not be reached', async () => {
    const location = useLocationStore()
    api.override('GET /location/556000', () => {
      throw new TypeError('Failed to fetch')
    })
    await location.locate('556000')
    expect(location.originOf('556000')).toBeNull()
    expect(location.isUnplaced('556000')).toBe(false)

    api.override('GET /location/556000', () =>
      jsonResponse({ postal: '556000', district: 'x', ...HOME }),
    )
    await location.locate('556000')
    await flushPromises()
    expect(location.originOf('556000')).toMatchObject(HOME)
  })

  it('adds the distance from a postal code to a school', async () => {
    const location = useLocationStore()
    await location.locate('556000')
    const rosyth = SCHOOLS[1]!
    const school = makeSchool({ latitude: rosyth.latitude, longitude: rosyth.longitude })
    const located = location.withDistance(school, '556000')
    expect(located.distanceKm).toBeCloseTo(distanceKm(HOME, rosyth)!, 10)
    expect(school.distanceKm).toBeNull()
  })

  it('has no distance for a postal code that is not placed yet', () => {
    expect(useLocationStore().withDistance(makeSchool(), '556000').distanceKm).toBeNull()
  })
})
