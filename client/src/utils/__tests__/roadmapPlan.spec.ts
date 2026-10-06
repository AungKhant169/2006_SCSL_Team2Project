import { describe, expect, it } from 'vitest'
import { schoolsInTier } from '@/data/schools'
import {
  benchmarkOrder,
  eligibleSchools,
  PLAN_LENGTH,
  ruleBasedOrder,
  savedPlanNodes,
  toPlanNodes,
} from '../roadmapPlan'

describe('roadmap ordering', () => {
  it('rule-based plan puts the nearest institution first', () => {
    const order = ruleBasedOrder(schoolsInTier('primary'))
    expect(order.map((s) => s.distanceKm)).toEqual([0.8, 1.4, 4.6, 9.8])
  })

  it('AI plan favours the most selective benchmark, independent of distance', () => {
    // Primary: higher Phase 2C ratio = more competitive.
    expect(benchmarkOrder(schoolsInTier('primary'))[0]?.acronym).toBe('NYPS')
    // Secondary: a lower PSLE AL cut-off = more selective.
    expect(benchmarkOrder(schoolsInTier('secondary'))[0]?.acronym).toBe('RI')
  })

  it('does not mutate the pool it orders', () => {
    const pool = schoolsInTier('secondary')
    const before = pool.map((s) => s.id)
    ruleBasedOrder(pool)
    benchmarkOrder(pool)
    expect(pool.map((s) => s.id)).toEqual(before)
  })

  it('the two plans can differ for the same stage', () => {
    const pool = schoolsInTier('secondary')
    expect(ruleBasedOrder(pool)[0]).not.toBe(benchmarkOrder(pool)[0])
  })
})

describe('eligibleSchools', () => {
  it('is the pool of institutions in the target tier', () => {
    expect(eligibleSchools('uni')).toHaveLength(4)
  })

  it('is empty for preschool, which has no institution records yet', () => {
    expect(eligibleSchools('preschool')).toEqual([])
  })
})

describe('toPlanNodes', () => {
  const nodes = toPlanNodes(ruleBasedOrder(schoolsInTier('secondary')), 'secondary', '556000')

  it('lists at most three numbered choices with ordinal labels', () => {
    expect(nodes).toHaveLength(PLAN_LENGTH)
    expect(nodes.map((n) => n.step)).toEqual([1, 2, 3])
    expect(nodes.map((n) => n.label)).toEqual(['1st choice', '2nd choice', '3rd choice'])
  })

  it('describes the benchmark and distance from the profile postal code', () => {
    expect(nodes[0]).toMatchObject({
      schoolName: "St. Gabriel's Secondary School",
      detail: 'PSLE AL range: AL 4 – 15 · 1.1 km from 556000',
    })
  })

  it('returns fewer nodes when the pool is small', () => {
    expect(toPlanNodes(schoolsInTier('primary').slice(0, 2), 'primary', '556000')).toHaveLength(2)
  })
})

describe('savedPlanNodes', () => {
  it('resolves saved school ids in order', () => {
    const nodes = savedPlanNodes([8, 6], 'secondary', '556000')
    expect(nodes.map((n) => n.schoolName)).toEqual([
      "St. Gabriel's Secondary School",
      "Cedar Girls' Secondary School",
    ])
  })

  it('tolerates a school that no longer exists', () => {
    expect(savedPlanNodes([9999], 'secondary', '556000')[0]).toMatchObject({
      schoolName: 'Not available',
      detail: 'Not available',
    })
  })
})
