/*
 * The AI roadmap generator and the admin dataset pipeline have no backend yet. Their simulated
 * services read these URL flags so every outcome in the design (success, AI error, API timeout,
 * parse failure) can be demonstrated, e.g. /?aiOutcome=error or /?adminOutcome=timeout.
 * The flags are captured when the page loads so they survive in-app navigation.
 */

export type AiOutcome = 'success' | 'error'
export type AdminOutcome = 'success' | 'timeout' | 'parse'

const loadedParams = new URLSearchParams(window.location.search)

function readFlag<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = loadedParams.get(name)
  return allowed.includes(value as T) ? (value as T) : fallback
}

export const aiOutcome = (): AiOutcome => readFlag('aiOutcome', ['success', 'error'], 'success')

export const adminOutcome = (): AdminOutcome =>
  readFlag('adminOutcome', ['success', 'timeout', 'parse'], 'success')
