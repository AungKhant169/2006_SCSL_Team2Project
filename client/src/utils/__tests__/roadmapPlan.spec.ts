import { describe, expect, it } from 'vitest'
import { makeSchool } from '@/test/fixtures'
import type { School } from '@/types/school'
import { planNodes, PLAN_LENGTH } from '../roadmapPlan'

const secondary = makeSchool({
  id: 6,
  name: "Cedar Girls' Secondary School",
  tier: 'secondary',
  benchmark: { format: { kind: 'tScore' }, max: 300 },
  history: [{ year: '2017', value: 250 }],
  distanceKm: 1.14,
})
const poly = makeSchool({ id: 9, name: 'Temasek Junior College', tier: 'postsec' })

const known = (...schools: School[]) => Object.fromEntries(schools.map((s) => [s.id, s]))

describe('planNodes', () => {
  it('lists numbered choices with ordinal labels, in the order given', () => {
    const nodes = planNodes([6, 9], known(secondary, poly), 'secondary', '556000')
    expect(nodes.map((n) => n.step)).toEqual([1, 2])
    expect(nodes.map((n) => n.label)).toEqual(['1st choice', '2nd choice'])
    expect(nodes.map((n) => n.schoolName)).toEqual(["Cedar Girls' Secondary School", poly.name])
  })

  it('describes the benchmark and distance from the postal code', () => {
    const [node] = planNodes([6], known(secondary), 'secondary', '556000')
    expect(node?.detail).toBe('PSLE T-score cut-off: T-score ≥ 250 · 1.1 km from 556000')
  })

  it('leaves out a benchmark the school has none of', () => {
    const [node] = planNodes([9], known({ ...poly, distanceKm: 2 }), 'postsec', '556000')
    expect(node?.detail).toBe('2.0 km from 556000')
  })

  it('says when the distance is not known', () => {
    const [node] = planNodes([9], known(poly), 'postsec', '556000')
    expect(node?.detail).toBe('Distance not available')
  })

  it('tolerates a school that no longer exists', () => {
    const [node] = planNodes([9999], known(secondary), 'secondary', '556000')
    expect(node).toMatchObject({ schoolName: 'Not available', detail: 'Not available' })
  })

  it('carries the position of each school, for the map', () => {
    const placed = { ...secondary, latitude: 1.3395, longitude: 103.8336 }
    const [node] = planNodes([6], known(placed), 'secondary', '556000')
    expect(node).toMatchObject({ latitude: 1.3395, longitude: 103.8336 })
  })

  it('has no position for a school the dataset cannot place, or one that no longer exists', () => {
    const unplaced = { ...poly, latitude: null, longitude: null }
    const nodes = planNodes([9, 9999], known(unplaced), 'postsec', '556000')
    expect(nodes.map((n) => [n.latitude, n.longitude])).toEqual([
      [null, null],
      [null, null],
    ])
  })

  it('a plan is three choices long', () => {
    expect(PLAN_LENGTH).toBe(3)
  })
})
