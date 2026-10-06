import { apiRequest, ApiError } from './http'

export interface Session {
  accessToken: string
  refreshToken: string
}

export interface Identity {
  id: number
  username: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
}

const toSession = (tokens: TokenResponse): Session => ({
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
})

const tokenBody = (session: Session) => ({
  access_token: session.accessToken,
  refresh_token: session.refreshToken,
})

export async function login(username: string, password: string): Promise<Session> {
  return toSession(
    await apiRequest<TokenResponse>('/user/login', {
      method: 'POST',
      body: { username, password },
    }),
  )
}

export async function register(username: string, password: string): Promise<Session> {
  return toSession(
    await apiRequest<TokenResponse>('/user/register', {
      method: 'POST',
      body: { username, password },
    }),
  )
}

export async function logout(session: Session): Promise<void> {
  await apiRequest<void>('/user/logout', { method: 'POST', body: tokenBody(session) })
}

export async function refresh(session: Session): Promise<Session> {
  return toSession(
    await apiRequest<TokenResponse>('/user/refresh', { method: 'POST', body: tokenBody(session) }),
  )
}

export function identity(session: Session): Promise<Identity> {
  return apiRequest<Identity>('/user/identity', { token: session.accessToken })
}

/**
 * Re-establishes a stored session. Access tokens are short-lived, so a 401 triggers a single
 * refresh before giving up. Throws when the session can no longer be used.
 */
export async function restoreSession(
  session: Session,
): Promise<{ session: Session; identity: Identity }> {
  try {
    return { session, identity: await identity(session) }
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const renewed = await refresh(session)
    return { session: renewed, identity: await identity(renewed) }
  }
}
