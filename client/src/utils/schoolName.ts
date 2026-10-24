/** Words that stay in capitals, and words that stay lower case unless they start the name. */
const KEEP_UPPER = new Set(['CHIJ', 'NUS'])
const KEEP_LOWER = new Set(['of', 'the', 'and', 'in', 'for', 'to', 'de', 'la'])
/** Words that carry no initial on a badge. */
const NO_INITIAL = new Set([...KEEP_LOWER, 'school'])

/** "ST. GABRIEL'S SECONDARY SCHOOL" to "St. Gabriel's Secondary School". The dataset shouts. */
export function formatSchoolName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\p{L}][\p{L}']*/gu, (word, offset: number) => {
      const upper = word.toUpperCase()
      if (KEEP_UPPER.has(upper)) return upper
      if (offset > 0 && KEEP_LOWER.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
}

/** Up to four initials, skipping filler words and bracketed notes: "Nanyang Primary School" is "NP". */
export function schoolAcronym(name: string): string {
  const initials = name
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => /^[\p{L}]/u.test(word) && !NO_INITIAL.has(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase())
  return initials.slice(0, 4).join('')
}
