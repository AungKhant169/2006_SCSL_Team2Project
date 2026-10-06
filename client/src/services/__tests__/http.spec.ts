import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError, GENERIC_ERROR } from '../http'

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the parsed JSON body of a successful call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { id: 1, username: 'planner2026' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiRequest('/user/identity')).resolves.toEqual({ id: 1, username: 'planner2026' })
  })

  it('sends JSON bodies with the right method and content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    await apiRequest('/user/login', { method: 'POST', body: { username: 'a', password: 'b' } })
    const [, init] = fetchMock.mock.calls[0]!
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ username: 'a', password: 'b' })
  })

  it('adds a bearer token when one is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    await apiRequest('/user/identity', { token: 'abc' })
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer abc')
  })

  it('does not send a content type or body for plain GETs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    await apiRequest('/')
    const init = fetchMock.mock.calls[0]![1]
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.body).toBeUndefined()
  })

  it('resolves to undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(apiRequest('/user/logout', { method: 'POST', body: {} })).resolves.toBeUndefined()
  })

  it('throws an ApiError carrying the server’s detail message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(409, { detail: 'Username taken.' })))
    const error = await apiRequest('/user/register').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Username taken.' })
  })

  it('uses the generic message when the error body is not a plain detail string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respond(422, { detail: [{ loc: ['body'], msg: 'bad' }] })),
    )
    await expect(apiRequest('/user/login')).rejects.toMatchObject({
      status: 422,
      message: GENERIC_ERROR,
    })
  })

  it('uses the generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))
    await expect(apiRequest('/')).rejects.toMatchObject({ status: 500, message: GENERIC_ERROR })
  })

  it('reports an unreachable server as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiRequest('/')).rejects.toMatchObject({ status: 0, message: GENERIC_ERROR })
  })
})
