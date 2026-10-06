import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '../authService'
import { ApiError, apiRequest } from '../http'

vi.mock('../http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../http')>()),
  apiRequest: vi.fn(),
}))

const request = vi.mocked(apiRequest)
const tokens = { access_token: 'a1', refresh_token: 'r1' }
const session = { accessToken: 'a1', refreshToken: 'r1' }

describe('authService (matches the /user API contract)', () => {
  beforeEach(() => request.mockReset())

  it('login posts credentials and maps the token pair', async () => {
    request.mockResolvedValue(tokens)
    await expect(authService.login('planner2026', 'abcd123!')).resolves.toEqual(session)
    expect(request).toHaveBeenCalledWith('/user/login', {
      method: 'POST',
      body: { username: 'planner2026', password: 'abcd123!' },
    })
  })

  it('register posts credentials to the registration endpoint', async () => {
    request.mockResolvedValue(tokens)
    await expect(authService.register('planner2026', 'abcd123!')).resolves.toEqual(session)
    expect(request).toHaveBeenCalledWith('/user/register', {
      method: 'POST',
      body: { username: 'planner2026', password: 'abcd123!' },
    })
  })

  it('logout sends both tokens', async () => {
    request.mockResolvedValue(undefined)
    await authService.logout(session)
    expect(request).toHaveBeenCalledWith('/user/logout', {
      method: 'POST',
      body: { access_token: 'a1', refresh_token: 'r1' },
    })
  })

  it('refresh exchanges the token pair for a new one', async () => {
    request.mockResolvedValue({ access_token: 'a2', refresh_token: 'r2' })
    await expect(authService.refresh(session)).resolves.toEqual({
      accessToken: 'a2',
      refreshToken: 'r2',
    })
  })

  it('identity authenticates with the access token', async () => {
    request.mockResolvedValue({ id: 3, username: 'planner2026' })
    await expect(authService.identity(session)).resolves.toEqual({ id: 3, username: 'planner2026' })
    expect(request).toHaveBeenCalledWith('/user/identity', { token: 'a1' })
  })

  describe('restoreSession', () => {
    it('returns the identity of a still-valid session untouched', async () => {
      request.mockResolvedValueOnce({ id: 3, username: 'planner2026' })
      await expect(authService.restoreSession(session)).resolves.toEqual({
        session,
        identity: { id: 3, username: 'planner2026' },
      })
      expect(request).toHaveBeenCalledTimes(1)
    })

    it('refreshes once when the access token has expired', async () => {
      request
        .mockRejectedValueOnce(new ApiError(401, 'expired'))
        .mockResolvedValueOnce({ access_token: 'a2', refresh_token: 'r2' })
        .mockResolvedValueOnce({ id: 3, username: 'planner2026' })
      const restored = await authService.restoreSession(session)
      expect(restored.session).toEqual({ accessToken: 'a2', refreshToken: 'r2' })
      expect(restored.identity.username).toBe('planner2026')
      expect(request).toHaveBeenNthCalledWith(3, '/user/identity', { token: 'a2' })
    })

    it('gives up when the refresh token is rejected too', async () => {
      request
        .mockRejectedValueOnce(new ApiError(401, 'expired'))
        .mockRejectedValueOnce(new ApiError(401, 'refresh expired'))
      await expect(authService.restoreSession(session)).rejects.toMatchObject({ status: 401 })
    })

    it('does not refresh for failures other than an expired token', async () => {
      request.mockRejectedValueOnce(new ApiError(0, 'unreachable'))
      await expect(authService.restoreSession(session)).rejects.toMatchObject({ status: 0 })
      expect(request).toHaveBeenCalledTimes(1)
    })
  })
})
