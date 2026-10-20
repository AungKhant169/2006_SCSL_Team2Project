import type { TierId } from '@/types/school'
import { isValidPostalCode, POSTAL_CODE_ERROR } from './postalCode'

export interface ProfileFields {
  level: TierId
  scoreA: string
  scoreB: string
  postal: string
}

const invalidScore = (message: string) => `Invalid academic score! ${message}`

function inRange(value: string, min: number, max: number, integer = false): boolean {
  const format = integer ? /^\d+$/ : /^\d+(\.\d+)?$/
  if (!format.test(value.trim())) return false
  const number = Number(value)
  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max &&
    (!integer || Number.isInteger(number))
  )
}

/** Returns the first form error, or an empty string when the profile can be saved. */
export function validateProfile({ level, scoreA, scoreB, postal }: ProfileFields): string {
  if (!isValidPostalCode(postal)) return POSTAL_CODE_ERROR

  const first = scoreA.trim()
  const second = scoreB.trim()

  switch (level) {
    case 'secondary':
      return inRange(first, 4, 32, true)
        ? ''
        : invalidScore('PSLE AL must be a whole number from 4 to 32.')
    case 'postsec':
      if (!first && !second) return invalidScore('Enter an L1R5 or ELR2B2 aggregate.')
      if (first && !inRange(first, 2, 54, true))
        return invalidScore('L1R5 must be a whole number from 2 to 54.')
      if (second && !inRange(second, 0, Infinity, true))
        return invalidScore('ELR2B2 must be a whole number.')
      return ''
    case 'uni':
      if (!first && !second) return invalidScore('Enter a polytechnic GPA or A-Level rank points.')
      if (first && !inRange(first, 0, 4)) return invalidScore('GPA must be between 0.00 and 4.00.')
      if (second && !inRange(second, 0, 90))
        return invalidScore('Rank points must be between 0 and 90.')
      return ''
    default:
      return ''
  }
}

/** Labels the primary academic result in the roadmap summary. */
export function describeScore(level: TierId, scoreA: string): string {
  const score = scoreA.trim()
  const labels: Partial<Record<TierId, string>> = {
    secondary: 'PSLE AL',
    postsec: 'L1R5',
    uni: 'Poly GPA',
  }
  const label = labels[level]
  return label && score ? `${label} ${score}` : 'No score on file'
}
