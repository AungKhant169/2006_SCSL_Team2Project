import { describe, expect, it } from 'vitest'
import { describeScore, validateProfile } from '../profileValidation'
import type { ProfileFields } from '../profileValidation'

const base: ProfileFields = {
  level: 'secondary',
  scoreA: '8',
  scoreB: '',
  postal: '556000',
}

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
      expect(
        check({
          level: 'preschool',
          scoreA: '',
          postal: '',
        }),
      ).toMatch(/postal code/)

      expect(
        check({
          level: 'primary',
          scoreA: '',
          postal: '556000',
        }),
      ).toBe('')
    })
  })

  describe('PSLE AL (4–32, whole number)', () => {
    // Boundary Value Analysis:
    // 4 = lower boundary
    // 5 = lower boundary + 1
    // 31 = upper boundary - 1
    // 32 = upper boundary
    // 17 = representative valid equivalence-class value
    it.each(['4', '5', '17', '31', '32'])('accepts %s', (scoreA) => {
      expect(check({ scoreA })).toBe('')
    })

    // Boundary Value Analysis:
    // 3 = lower boundary - 1
    // 33 = upper boundary + 1
    //
    // Equivalence Class Testing:
    // 35 = integer above valid range
    // 8.5 = decimal
    // '' = blank
    // abc = non-numeric
    // -4 = negative integer
    it.each(['3', '33', '35', '8.5', '', 'abc', '-4'])('rejects %j', (scoreA) => {
      expect(check({ scoreA })).toMatch(/^Invalid academic score! PSLE AL/)
    })
  })

  describe('post-secondary (L1R5 2–54, ELR2B2)', () => {
    const level = 'postsec' as const

    it('needs at least one aggregate', () => {
      expect(
        check({
          level,
          scoreA: '',
          scoreB: '',
        }),
      ).toMatch(/Enter an L1R5 or ELR2B2/)
    })

    it('accepts either aggregate on its own, or both', () => {
      expect(
        check({
          level,
          scoreA: '12',
          scoreB: '',
        }),
      ).toBe('')

      expect(
        check({
          level,
          scoreA: '',
          scoreB: '14',
        }),
      ).toBe('')

      expect(
        check({
          level,
          scoreA: '12',
          scoreB: '14',
        }),
      ).toBe('')
    })

    // Boundary Value Analysis for L1R5:
    // 2 = lower boundary
    // 3 = lower boundary + 1
    // 53 = upper boundary - 1
    // 54 = upper boundary
    // 28 = representative valid equivalence-class value
    it.each(['2', '3', '28', '53', '54'])('accepts L1R5 boundary/valid value %s', (scoreA) => {
      expect(
        check({
          level,
          scoreA,
          scoreB: '',
        }),
      ).toBe('')
    })

    // Boundary Value Analysis:
    // 1 = lower boundary - 1
    // 55 = upper boundary + 1
    //
    // Equivalence Class Testing:
    // 9.5 = decimal
    // x = non-numeric
    it.each(['1', '55', '9.5', 'x'])('rejects L1R5 %j', (scoreA) => {
      expect(
        check({
          level,
          scoreA,
          scoreB: '',
        }),
      ).toMatch(/L1R5 must be a whole number from 2 to 54/)
    })

    it('rejects a non-numeric ELR2B2', () => {
      expect(
        check({
          level,
          scoreA: '',
          scoreB: 'abc',
        }),
      ).toMatch(/ELR2B2/)
    })
  })

  describe('university (GPA 0–4, A-Level rank points 0–90)', () => {
    const level = 'uni' as const

    it('needs at least one result', () => {
      expect(
        check({
          level,
          scoreA: '',
          scoreB: '',
        }),
      ).toMatch(/Enter a polytechnic GPA/)
    })

    // Boundary Value Analysis for Polytechnic GPA:
    // Valid range: 0.00 to 4.00
    //
    // 0 = lower boundary
    // 0.01 = just above lower boundary
    // 3.50 = representative valid equivalence-class value
    // 3.99 = just below upper boundary
    // 4 = upper boundary
    it.each(['0', '0.01', '3.50', '3.99', '4'])('accepts GPA boundary/valid value %s', (scoreA) => {
      expect(
        check({
          level,
          scoreA,
          scoreB: '',
        }),
      ).toBe('')
    })

    // Boundary / Equivalence Class Testing for GPA:
    //
    // -0.01 = below lower boundary
    // 4.01 = above upper boundary
    // 4.5 = value above valid range
    // abc = non-numeric input
    it.each(['-0.01', '4.01', '4.5', 'abc'])('rejects GPA %j', (scoreA) => {
      expect(
        check({
          level,
          scoreA,
          scoreB: '',
        }),
      ).toMatch(/GPA must be between 0.00 and 4.00/)
    })

    // Boundary Value Analysis for A-Level Rank Points:
    // Valid range: 0 to 90
    //
    // 0 = lower boundary
    // 0.01 = just above lower boundary
    // 72.5 = representative valid equivalence-class value
    // 89.99 = just below upper boundary
    // 90 = upper boundary
    it.each(['0', '0.01', '72.5', '89.99', '90'])(
      'accepts rank points boundary/valid value %s',
      (scoreB) => {
        expect(
          check({
            level,
            scoreA: '',
            scoreB,
          }),
        ).toBe('')
      },
    )

    // Boundary / Equivalence Class Testing for Rank Points:
    //
    // -0.01 = below lower boundary
    // 90.01 = above upper boundary
    // 91 = value above valid range
    // rp = non-numeric input
    it.each(['-0.01', '90.01', '91', 'rp'])('rejects rank points %j', (scoreB) => {
      expect(
        check({
          level,
          scoreA: '',
          scoreB,
        }),
      ).toMatch(/Rank points must be between 0 and 90/)
    })
  })
})

describe('describeScore', () => {
  it('names the score that matters for the level', () => {
    expect(describeScore('secondary', '8')).toBe('PSLE AL 8')
    expect(describeScore('postsec', ' 12 ')).toBe('L1R5 12')
    expect(describeScore('uni', '3.85')).toBe('Poly GPA 3.85')
  })

  it('reports no score when the level collects none or the field is empty', () => {
    expect(describeScore('preschool', '8')).toBe('No score on file')
    expect(describeScore('primary', '8')).toBe('No score on file')
    expect(describeScore('secondary', '')).toBe('No score on file')
    expect(describeScore('uni', '   ')).toBe('No score on file')
  })
})

describe('numeric text formats (Lab 4 reconstruction follow-up)', () => {
  it.each(['8e0', '0x8', '+8', '8.0'])(
    'rejects non-digit PSLE text %j even when Number() produces an integer',
    (scoreA) => {
      expect(check({ scoreA })).toMatch(/PSLE AL/)
    },
  )

  it.each(['3e0', '0x3', '+3', '.5', '3.'])('rejects non-standard GPA text %j', (scoreA) => {
    expect(check({ level: 'uni', scoreA, scoreB: '' })).toMatch(/GPA/)
  })

  it('preserves the ELR2B2 error message', () => {
    expect(check({ level: 'postsec', scoreA: '', scoreB: 'abc' })).toBe(
      'Invalid academic score! ELR2B2 must be a whole number.',
    )
  })
})
