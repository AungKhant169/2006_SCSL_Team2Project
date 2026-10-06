import { describe, expect, it } from 'vitest'
import { DIRECTORY_TIER_IDS, DIRECTORY_TIERS, getLevel, getTier, LEVELS, TIERS } from '../education'
import { SCHOOLS, getSchool, schoolsInTier } from '../schools'

describe('school seed data', () => {
  it('has unique ids and valid six-digit postal codes', () => {
    const ids = SCHOOLS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const school of SCHOOLS) expect(school.postal).toMatch(/^\d{6}$/)
  })

  it('gives every directory tier at least one school', () => {
    for (const tier of DIRECTORY_TIER_IDS) expect(schoolsInTier(tier).length).toBeGreaterThan(0)
  })

  it('carries four years of benchmark history, oldest first', () => {
    for (const school of SCHOOLS) {
      expect(school.history.map((h) => h.year)).toEqual(['2022', '2023', '2024', '2025'])
      for (const point of school.history) {
        expect(point.value).toBeGreaterThan(0)
        expect(point.value).toBeLessThanOrEqual(school.benchmark.max)
      }
    }
  })

  it('lists courses with a fee for each citizenship tier (BR-1)', () => {
    for (const school of SCHOOLS) {
      expect(school.courses.length).toBeGreaterThan(0)
      for (const c of school.courses)
        expect(Object.keys(c.fees).sort()).toEqual(['intl', 'pr', 'sc'])
    }
  })

  it('only tertiary institutions declare fields of study', () => {
    for (const school of SCHOOLS) {
      const tertiary = school.tier === 'postsec' || school.tier === 'uni'
      expect(Boolean(school.fields)).toBe(tertiary)
    }
  })

  it('looks schools up by id', () => {
    expect(getSchool(2)?.name).toBe('Rosyth School')
    expect(getSchool(9999)).toBeUndefined()
  })
})

describe('education tiers and levels', () => {
  it('excludes preschool from the directory but keeps it as a roadmap stage', () => {
    expect(DIRECTORY_TIERS.map((t) => t.id)).toEqual(['primary', 'secondary', 'postsec', 'uni'])
    expect(LEVELS.map((l) => l.id)).toEqual(TIERS.map((t) => t.id))
  })

  it('resolves tiers and levels by id and rejects unknown ids', () => {
    expect(getTier('uni').label).toBe('University')
    expect(getLevel('secondary').label).toBe('S1 Posting')
    // @ts-expect-error deliberately invalid id
    expect(() => getTier('nope')).toThrow(/Unknown tier/)
    // @ts-expect-error deliberately invalid id
    expect(() => getLevel('nope')).toThrow(/Unknown education level/)
  })
})
