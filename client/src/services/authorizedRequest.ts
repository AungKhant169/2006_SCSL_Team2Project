import { refresh } from './authService'
import type { Session } from './authService'
import { ApiError, apiDownload, apiRequest } from './http'
import type { Download, RequestOptions } from './http'

/** Shown when a signed-out visitor, or one whose session was refused, reaches a protected call. */
export const SESSION_ENDED = 'Your session has expired. Please log in again.'

/** What the signed-in session lends to requests: its tokens, and a way to report on them. */
export interface SessionBinding {
  current(): Session | null
  /** Called with the token pair that replaced an expired one. */
  renewed(session: Session): void
  /** Called when the server refuses the session for good, so the app can sign the user out. */
  rejected(): void
}

let binding: SessionBinding | null = null
/** Refresh tokens are single use, so concurrent 401s must share one renewal. */
let renewal: Promise<Session> | null = null

export function bindSession(next: SessionBinding | null) {
  binding = next
  renewal = null
}

function renew(stale: Session): Promise<Session> {
  renewal ??= refresh(stale)
    .then((session) => {
      binding?.renewed(session)
      return session
    })
    .finally(() => {
      renewal = null
    })
  return renewal
}

/**
 * Makes a call with the signed-in user's access token. Access tokens are short-lived, so a 401
 * renews the pair once and repeats the call. A refusal of the refresh token ends the session; an
 * unreachable server does not.
 */
async function withSession<T>(call: (token: string) => Promise<T>): Promise<T> {
  const session = binding?.current()
  if (!session) throw new ApiError(401, SESSION_ENDED)

  try {
    return await call(session.accessToken)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error

    // Another call may already have renewed the tokens while this one was in flight.
    const latest = binding?.current()
    if (!latest) throw error
    let next = latest
    if (latest.accessToken === session.accessToken) {
      try {
        next = await renew(session)
      } catch (renewError) {
        if (renewError instanceof ApiError && renewError.status !== 0) binding?.rejected()
        throw renewError
      }
    }
    return call(next.accessToken)
  }
}

/** A request with the signed-in user's access token. */
export function authorizedRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  return withSession((token) => apiRequest<T>(path, { ...options, token }))
}

/** A file download with the signed-in user's access token. */
export function authorizedDownload(path: string): Promise<Download> {
  return withSession((token) => apiDownload(path, { token }))
}
