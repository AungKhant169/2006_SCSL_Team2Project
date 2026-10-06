import type { Session } from './authService'

const KEY = 'pathsg.session'

/** Browser storage can be unavailable (private mode, blocked cookies); sessions then last one page load. */
export function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
    }
  } catch {
    // fall through: treat unreadable data as no session
  }
  return null
}

export function saveSession(session: Session): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // storage unavailable: the in-memory session still works
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
