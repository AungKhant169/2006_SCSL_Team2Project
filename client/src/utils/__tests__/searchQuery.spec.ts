import { describe, expect, it } from 'vitest'
import { parseSearchQuery } from '../searchQuery'

describe('parseSearchQuery (REQ-1.1)', () => {
  it('treats an empty or whitespace-only box as "no search" without an error', () => {
    expect(parseSearchQuery('')).toEqual({ term: '', error: '' })
    expect(parseSearchQuery('   ')).toEqual({ term: '', error: '' })
  })

  it('rejects a single character and asks for at least two', () => {
    const result = parseSearchQuery('N')
    expect(result.term).toBe('')
    expect(result.error).toBe('Enter at least 2 characters to search.')
  })

  it('accepts two or more characters, trimmed and lower-cased', () => {
    expect(parseSearchQuery('  NUS ')).toEqual({ term: 'nus', error: '' })
    expect(parseSearchQuery('NY')).toEqual({ term: 'ny', error: '' })
  })

  it('accepts letters, digits, spaces, hyphens, periods and apostrophes', () => {
    expect(parseSearchQuery("St. Gabriel's")).toEqual({ term: "st. gabriel's", error: '' })
    expect(parseSearchQuery('Bukit-Panjang 2')).toEqual({ term: 'bukit-panjang 2', error: '' })
  })

  it.each(['<>', ';--', '$$$$', '***'])('rejects symbol-only input %j', (input) => {
    const result = parseSearchQuery(input)
    expect(result.term).toBe('')
    expect(result.error).toMatch(/must include letters or numbers/)
  })

  it('strips disallowed symbols from mixed input and reports it', () => {
    const result = parseSearchQuery('<script>')
    expect(result.term).toBe('script')
    expect(result.error).toMatch(/Unsupported characters were removed/)
  })

  it('drops the term entirely when sanitising leaves fewer than two characters', () => {
    const result = parseSearchQuery('#a#')
    expect(result.term).toBe('')
    expect(result.error).toMatch(/Unsupported characters were removed/)
  })
})
