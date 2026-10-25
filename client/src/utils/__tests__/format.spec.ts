import { describe, expect, it } from 'vitest'
import {
  choiceLabel,
  formatDistance,
  formatFileSize,
  formatMoney,
  formatTimestamp,
  pluralize,
} from '../format'

describe('formatFileSize', () => {
  it('counts bytes below a kilobyte', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(812)).toBe('812 B')
  })

  it('rounds kilobytes to a whole number', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(860_160)).toBe('840 KB')
  })

  it('shows megabytes to one decimal, and never "1024 KB"', () => {
    expect(formatFileSize(1_048_575)).toBe('1.0 MB')
    expect(formatFileSize(4_404_019)).toBe('4.2 MB')
  })
})

describe('formatMoney', () => {
  it('prefixes S$ and groups thousands', () => {
    expect(formatMoney(13)).toBe('S$13')
    expect(formatMoney(32900)).toBe('S$32,900')
  })

  it('shows an em dash when nothing is payable', () => {
    expect(formatMoney(0)).toBe('—')
  })
})

describe('formatTimestamp', () => {
  it('formats afternoon times in 12-hour clock', () => {
    expect(formatTimestamp(new Date(2026, 8, 9, 21, 14))).toBe('09 Sep 2026, 9:14 pm')
  })

  it('formats morning times and pads minutes', () => {
    expect(formatTimestamp(new Date(2026, 8, 2, 7, 5))).toBe('02 Sep 2026, 7:05 am')
  })

  it('treats midnight and noon as 12', () => {
    expect(formatTimestamp(new Date(2026, 0, 1, 0, 0))).toBe('01 Jan 2026, 12:00 am')
    expect(formatTimestamp(new Date(2026, 0, 1, 12, 30))).toBe('01 Jan 2026, 12:30 pm')
  })

  it('parses ISO strings without a timezone as local time', () => {
    expect(formatTimestamp('2026-09-09T21:14:00')).toBe('09 Sep 2026, 9:14 pm')
  })
})

describe('choiceLabel', () => {
  it('uses ordinals for the first three choices', () => {
    expect([0, 1, 2].map(choiceLabel)).toEqual(['1st choice', '2nd choice', '3rd choice'])
  })

  it('keeps counting past the third', () => {
    expect(choiceLabel(3)).toBe('4th choice')
  })
})

describe('pluralize', () => {
  it('only keeps the singular for exactly one', () => {
    expect(pluralize(1, 'school')).toBe('school')
    expect(pluralize(0, 'school')).toBe('schools')
    expect(pluralize(10, 'school')).toBe('schools')
  })
})

describe('formatDistance', () => {
  it('shows kilometres to one decimal when the distance is known', () => {
    expect(formatDistance(4.55)).toMatch(/^4.[56] km$/)
    expect(formatDistance(1)).toBe('1.0 km')
  })

  it('prompts for a postal code otherwise', () => {
    expect(formatDistance(null)).toBe('Add postal code')
  })
})
