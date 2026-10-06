export const MAX_REVIEW_WORDS = 200
export const BLANK_REVIEW_ERROR = 'Review text cannot be blank or consist entirely of spaces.'

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Truncates text to the word cap, keeping a trailing space so typing can continue naturally. */
export function clampWords(text: string, max = MAX_REVIEW_WORDS): string {
  const words = text.split(/\s+/).filter(Boolean)
  return words.length > max ? `${words.slice(0, max).join(' ')} ` : text
}

/** Strips HTML tags and surrounding whitespace before a review is stored (REQ-4.4). */
export function sanitizeReviewText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}
