import { describe, expect, it } from 'vitest'
import { validateProfile } from '../profileValidation'
import type { ProfileFields } from '../profileValidation'

const base: ProfileFields = { level: 'secondary', scoreA: '8', scoreB: '', postal: '556000' }
const check = (overrides: Partial<ProfileFields>) => validateProfile({ ...base, ...overrides })

describe('validateProfile', () => {
  it('accepts a complete secondary profile', () => {
    expect(check({})).toBe('')
  })

  describe('postal code (REQ-2.10, REQ-2.16)', () => {
    it.each(['', '12345', '1234567', 'abcdef', '55 600'])('rejects %j', (postal) => {
      expect(check({ postal })).toBe('Please enter a valid 6-digit Singapore postal code.')
    })

    it('is reported ahead of a score problem', () => {
      expect(check({ postal: '123', scoreA: '99' })).toMatch(/postal code/)
    })

    it('is required even when no academic result is collected', () => {
      expect(check({ level: 'preschool', scoreA: '', postal: '' })).toMatch(/postal code/)
      expect(check({ level: 'primary', scoreA: '', postal: '556000' })).toBe('')
    })
  })

  describe('PSLE AL (4–32, whole number)', () => {
    it.each(['4', '32', '17'])('accepts %s', (scoreA) => {
      expect(check({ scoreA })).toBe('')
    })

    it.each(['3', '35', '8.5', '', 'abc', '-4'])('rejects %j', (scoreA) => {
      expect(check({ scoreA })).toMatch(/^Invalid academic score! PSLE AL/)
    })
  })

  describe('post-secondary (L1R5 2–54, ELR2B2)', () => {
    const level = 'postsec' as const

    it('needs at least one aggregate', () => {
      expect(check({ level, scoreA: '', scoreB: '' })).toMatch(/Enter an L1R5 or ELR2B2/)
    })

    it('accepts either aggregate on its own, or both', () => {
      expect(check({ level, scoreA: '12', scoreB: '' })).toBe('')
      expect(check({ level, scoreA: '', scoreB: '14' })).toBe('')
      expect(check({ level, scoreA: '12', scoreB: '14' })).toBe('')
    })

    it.each(['1', '55', '9.5', 'x'])('rejects L1R5 %j', (scoreA) => {
      expect(check({ level, scoreA, scoreB: '' })).toMatch(
        /L1R5 must be a whole number from 2 to 54/,
      )
    })

    it('rejects a non-numeric ELR2B2', () => {
      expect(check({ level, scoreA: '', scoreB: 'abc' })).toMatch(/ELR2B2/)
    })
  })

  describe('university (GPA 0–4, A-Level rank points 0–90)', () => {
    const level = 'uni' as const

    it('needs at least one result', () => {
      expect(check({ level, scoreA: '', scoreB: '' })).toMatch(/Enter a polytechnic GPA/)
    })

    it.each(['0', '3.85', '4', '4.00'])('accepts GPA %s', (scoreA) => {
      expect(check({ level, scoreA, scoreB: '' })).toBe('')
    })

    it.each(['4.5', '-1', 'abc', '4.01'])('rejects GPA %j', (scoreA) => {
      expect(check({ level, scoreA, scoreB: '' })).toMatch(/GPA must be between 0.00 and 4.00/)
    })

    it.each(['0', '72.5', '90'])('accepts rank points %s', (scoreB) => {
      expect(check({ level, scoreA: '', scoreB })).toBe('')
    })

    it.each(['91', '-2', 'rp'])('rejects rank points %j', (scoreB) => {
      expect(check({ level, scoreA: '', scoreB })).toMatch(/Rank points must be between 0 and 90/)
    })
  })
})
