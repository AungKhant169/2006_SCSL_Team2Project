import { describe, expect, it } from 'vitest'
import { TIERS } from '../education'
import { describeDistanceLimit, DISTANCE_LIMIT, distanceLimitKm, RULE_SORTS } from '../ruleSort'

describe('distance limit', () => {
  it('is the value of the slider, except at its top end, where there is none', () => {
    expect(distanceLimitKm(DISTANCE_LIMIT.min)).toBe(DISTANCE_LIMIT.min)
    expect(distanceLimitKm(DISTANCE_LIMIT.max - 1)).toBe(DISTANCE_LIMIT.max - 1)
    expect(distanceLimitKm(DISTANCE_LIMIT.max)).toBeNull()
  })

  it('reads as a distance, or as any distance at the top end', () => {
    expect(describeDistanceLimit(5)).toBe('Within 5 km')
    expect(describeDistanceLimit(DISTANCE_LIMIT.max)).toBe('Any distance')
  })
})

describe('what each stage ranks by', () => {
  it('is stated for every stage, with a grade only where one applies', () => {
    expect(Object.keys(RULE_SORTS).sort()).toEqual(TIERS.map((t) => t.id).sort())
    expect(RULE_SORTS.primary).toEqual(['distance'])
    expect(RULE_SORTS.secondary).toEqual(['distance', 'grade'])
    expect(RULE_SORTS.postsec).toEqual(['distance', 'grade'])
    expect([RULE_SORTS.preschool, RULE_SORTS.uni]).toEqual([[], []])
  })
})
