import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refresh } from '../authService'
import type { Session } from '../authService'
import {
  authorizedDownload,
  authorizedRequest,
  bindSession,
  SESSION_ENDED,
} from '../authorizedRequest'
import { ApiError, apiDownload, apiRequest } from '../http'
import type { Download } from '../http'

vi.mock('../http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../http')>()),
  apiRequest: vi.fn(),
  apiDownload: vi.fn(),
}))
vi.mock('../authService', () => ({ refresh: vi.fn() }))

const request = vi.mocked(apiRequest)
const fetchFile = vi.mocked(apiDownload)
const renewToken = vi.mocked(refresh)

const first: Session = { accessToken: 'a1', refreshToken: 'r1' }
const second: Session = { accessToken: 'a2', refreshToken: 'r2' }
const expired = () => new ApiError(401, 'Your session is invalid. Please log in again.')

/** A session holder like the auth store's, with its callbacks recorded. */
function bindTo(initial: Session | null) {
  let session = initial
  const renewed = vi.fn((next: Session) => (session = next))
  const rejected = vi.fn(() => (session = null))
  bindSession({ current: () => session, renewed, rejected })
  return { renewed, rejected, current: () => session }
}

describe('authorizedRequest', () => {
  beforeEach(() => {
    request.mockReset()
    renewToken.mockReset()
  })

  it('sends the request with the access token and returns the response', async () => {
    bindTo(first)
    request.mockResolvedValue({ id: 1 })
    await expect(authorizedRequest('/profile', { method: 'PUT', body: { a: 1 } })).resolves.toEqual(
      {
        id: 1,
      },
    )
    expect(request).toHaveBeenCalledWith('/profile', {
      method: 'PUT',
      body: { a: 1 },
      token: 'a1',
    })
  })

  it('refuses without a session, without calling the server', async () => {
    bindTo(null)
    await expect(authorizedRequest('/profile')).rejects.toMatchObject({
      status: 401,
      message: SESSION_ENDED,
    })
    expect(request).not.toHaveBeenCalled()
  })

  it('renews an expired access token once and repeats the request', async () => {
    const { renewed } = bindTo(first)
    request.mockRejectedValueOnce(expired()).mockResolvedValueOnce({ ok: true })
    renewToken.mockResolvedValue(second)
    await expect(authorizedRequest('/bookmark')).resolves.toEqual({ ok: true })
    expect(renewToken).toHaveBeenCalledWith(first)
    expect(renewed).toHaveBeenCalledWith(second)
    expect(request).toHaveBeenLastCalledWith('/bookmark', { token: 'a2' })
  })

  it('shares one renewal between requests that expire together', async () => {
    bindTo(first)
    request.mockImplementation(async (_path, options) => {
      if (options?.token === 'a1') throw expired()
      return { token: options?.token }
    })
    renewToken.mockResolvedValue(second)
    const results = await Promise.all([
      authorizedRequest('/bookmark'),
      authorizedRequest('/profile'),
      authorizedRequest('/roadmap'),
    ])
    expect(renewToken).toHaveBeenCalledTimes(1)
    expect(results).toEqual([{ token: 'a2' }, { token: 'a2' }, { token: 'a2' }])
  })

  it('uses tokens another request has already renewed instead of renewing again', async () => {
    const holder = bindTo(first)
    request.mockImplementationOnce(async () => {
      holder.renewed(second)
      throw expired()
    })
    request.mockResolvedValueOnce({ ok: true })
    await expect(authorizedRequest('/profile')).resolves.toEqual({ ok: true })
    expect(renewToken).not.toHaveBeenCalled()
    expect(request).toHaveBeenLastCalledWith('/profile', { token: 'a2' })
  })

  it('ends the session when the refresh token is refused', async () => {
    const { rejected } = bindTo(first)
    request.mockRejectedValue(expired())
    renewToken.mockRejectedValue(new ApiError(401, 'Your session has expired.'))
    await expect(authorizedRequest('/profile')).rejects.toMatchObject({ status: 401 })
    expect(rejected).toHaveBeenCalledOnce()
  })

  it('keeps the session when the server cannot be reached to renew it', async () => {
    const { rejected } = bindTo(first)
    request.mockRejectedValue(expired())
    renewToken.mockRejectedValue(new ApiError(0, 'unreachable'))
    await expect(authorizedRequest('/profile')).rejects.toMatchObject({ status: 0 })
    expect(rejected).not.toHaveBeenCalled()
  })

  it('does not renew for errors other than an expired token', async () => {
    bindTo(first)
    request.mockRejectedValue(new ApiError(403, 'Forbidden'))
    await expect(authorizedRequest('/admin/dataset')).rejects.toMatchObject({ status: 403 })
    expect(renewToken).not.toHaveBeenCalled()
  })

  it('gives up if the repeated request is refused too', async () => {
    bindTo(first)
    request.mockRejectedValue(expired())
    renewToken.mockResolvedValue(second)
    await expect(authorizedRequest('/profile')).rejects.toMatchObject({ status: 401 })
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('authorizedDownload', () => {
  const download = (name: string): Download => ({ blob: new Blob(['a,b']), filename: name })

  beforeEach(() => {
    fetchFile.mockReset()
    renewToken.mockReset()
  })

  it('fetches the file with the access token', async () => {
    bindTo(first)
    fetchFile.mockResolvedValue(download('schools.csv'))
    await expect(authorizedDownload('/admin/dataset/export')).resolves.toMatchObject({
      filename: 'schools.csv',
    })
    expect(fetchFile).toHaveBeenCalledWith('/admin/dataset/export', { token: 'a1' })
  })

  it('refuses without a session, without calling the server', async () => {
    bindTo(null)
    await expect(authorizedDownload('/admin/dataset/export')).rejects.toMatchObject({
      status: 401,
      message: SESSION_ENDED,
    })
    expect(fetchFile).not.toHaveBeenCalled()
  })

  it('renews an expired access token once and repeats the download', async () => {
    const { renewed } = bindTo(first)
    fetchFile.mockRejectedValueOnce(expired()).mockResolvedValueOnce(download('schools.csv'))
    renewToken.mockResolvedValue(second)
    await expect(authorizedDownload('/admin/dataset/export')).resolves.toMatchObject({
      filename: 'schools.csv',
    })
    expect(renewed).toHaveBeenCalledWith(second)
    expect(fetchFile).toHaveBeenLastCalledWith('/admin/dataset/export', { token: 'a2' })
  })

  it('ends the session when the refresh token is refused', async () => {
    const { rejected } = bindTo(first)
    fetchFile.mockRejectedValue(expired())
    renewToken.mockRejectedValue(new ApiError(401, 'Your session has expired.'))
    await expect(authorizedDownload('/admin/dataset/export')).rejects.toMatchObject({
      status: 401,
    })
    expect(rejected).toHaveBeenCalledOnce()
  })
})
