import { describe, expect, it } from 'vitest'
import { isValidPostalCode, sanitizePostalInput } from '../postalCode'

describe('postal code helpers', () => {
  it('accepts exactly six digits', () => {
    expect(isValidPostalCode('556000')).toBe(true)
    expect(isValidPostalCode('000000')).toBe(true)
  })

  it.each(['', '12345', '1234567', '12 456', 'abcdef', '12345a'])('rejects %j', (value) => {
    expect(isValidPostalCode(value)).toBe(false)
  })

  it('strips non-digits and caps input at six characters', () => {
    expect(sanitizePostalInput('55a6-0 00')).toBe('556000')
    expect(sanitizePostalInput('123456789')).toBe('123456')
    expect(sanitizePostalInput('abc')).toBe('')
  })
})
