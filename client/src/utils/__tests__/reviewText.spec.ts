import { describe, expect, it } from 'vitest'
import { clampWords, countWords, MAX_REVIEW_WORDS, sanitizeReviewText } from '../reviewText'

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords('one')).toBe(1)
    expect(countWords('  one   two\nthree\t')).toBe(3)
  })
})

describe('clampWords (REQ-4.2)', () => {
  it('leaves text within the limit untouched', () => {
    expect(clampWords(words(200))).toBe(words(200))
    expect(clampWords('hello ')).toBe('hello ')
  })

  it('cuts text at 200 words and keeps a trailing space', () => {
    const clamped = clampWords(words(250))
    expect(countWords(clamped)).toBe(MAX_REVIEW_WORDS)
    expect(clamped.endsWith('w199 ')).toBe(true)
  })

  it('honours a custom limit', () => {
    expect(clampWords('a b c d', 2)).toBe('a b ')
  })
})

describe('sanitizeReviewText (REQ-4.4)', () => {
  it('strips HTML tags and trims', () => {
    expect(sanitizeReviewText('  <b>Great</b> school <script>alert(1)</script>  ')).toBe(
      'Great school alert(1)',
    )
  })

  it('returns an empty string for blank or tag-only input', () => {
    expect(sanitizeReviewText('   ')).toBe('')
    expect(sanitizeReviewText('<img src=x>')).toBe('')
  })
})
