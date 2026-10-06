import type { TierId } from '@/types/school'
import { isValidPostalCode, POSTAL_CODE_ERROR } from './postalCode'

export interface ProfileFields {
  level: TierId
  scoreA: string
  scoreB: string
  postal: string
}

const INVALID = 'Invalid academic score!'

const isBlank = (value: string) => value.trim() === ''
const isWholeNumber = (value: string) => /^\d+$/.test(value.trim())
const isDecimal = (value: string) => /^\d+(\.\d+)?$/.test(value.trim())
const inRange = (value: string, min: number, max: number) =>
  Number(value) >= min && Number(value) <= max

/**
 * Validates the academic parameters and postal code against the scoring frameworks (REQ-2.8,
 * REQ-2.10, BR-3, BR-4). Returns the inline message to show, or an empty string when valid.
 * A postal code problem takes priority over a score problem.
 */
export function validateProfile({ level, scoreA, scoreB, postal }: ProfileFields): string {
  if (!isValidPostalCode(postal)) return POSTAL_CODE_ERROR

  switch (level) {
    case 'secondary':
      if (!isWholeNumber(scoreA) || !inRange(scoreA, 4, 32)) {
        return `${INVALID} PSLE AL must be a whole number from 4 to 32.`
      }
      break
    case 'postsec':
      if (isBlank(scoreA) && isBlank(scoreB)) {
        return `${INVALID} Enter an L1R5 or ELR2B2 aggregate.`
      }
      if (!isBlank(scoreA) && (!isWholeNumber(scoreA) || !inRange(scoreA, 2, 54))) {
        return `${INVALID} L1R5 must be a whole number from 2 to 54.`
      }
      if (!isBlank(scoreB) && !isWholeNumber(scoreB)) {
        return `${INVALID} ELR2B2 must be a whole number.`
      }
      break
    case 'uni':
      if (isBlank(scoreA) && isBlank(scoreB)) {
        return `${INVALID} Enter a polytechnic GPA or A-Level rank points.`
      }
      if (!isBlank(scoreA) && (!isDecimal(scoreA) || !inRange(scoreA, 0, 4))) {
        return `${INVALID} GPA must be between 0.00 and 4.00.`
      }
      if (!isBlank(scoreB) && (!isDecimal(scoreB) || !inRange(scoreB, 0, 90))) {
        return `${INVALID} Rank points must be between 0 and 90.`
      }
      break
    default:
      break
  }
  return ''
}
