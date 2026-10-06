export const MIN_QUERY_LENGTH = 2

export interface ParsedQuery {
  /** Normalised, lower-cased text to match against. Empty when no search should run. */
  term: string
  /** Inline message to show next to the field, empty when the input is fine. */
  error: string
}

const ALLOWED_CHARS = /^[A-Za-z0-9 '.-]+$/
const DISALLOWED_CHARS = /[^A-Za-z0-9 '.-]/g

/**
 * Applies the keyword search input rules (REQ-1.1): at least two characters, letters / numbers /
 * spaces / hyphens / periods / apostrophes only. Symbols are stripped rather than sent anywhere.
 */
export function parseSearchQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { term: '', error: '' }

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { term: '', error: `Enter at least ${MIN_QUERY_LENGTH} characters to search.` }
  }
  if (!/[A-Za-z0-9]/.test(trimmed)) {
    return {
      term: '',
      error: 'Search must include letters or numbers. Symbols and code syntax are ignored.',
    }
  }
  if (!ALLOWED_CHARS.test(trimmed)) {
    const cleaned = trimmed.replace(DISALLOWED_CHARS, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    return {
      term: cleaned.length >= MIN_QUERY_LENGTH ? cleaned : '',
      error:
        'Unsupported characters were removed. Letters, numbers, spaces, hyphens, periods and apostrophes only.',
    }
  }
  return { term: trimmed.toLowerCase(), error: '' }
}
