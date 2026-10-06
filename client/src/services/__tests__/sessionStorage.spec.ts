import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, loadSession, saveSession } from '../sessionStorage'

const session = { accessToken: 'a1', refreshToken: 'r1' }

describe('session persistence', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('round-trips a session', () => {
    saveSession(session)
    expect(loadSession()).toEqual(session)
  })

  it('clears a stored session', () => {
    saveSession(session)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull()
  })

  it.each(['not json', '{"accessToken":1}', '{"refreshToken":"r"}', 'null'])(
    'treats corrupt data %j as no session',
    (raw) => {
      window.sessionStorage.setItem('pathsg.session', raw)
      expect(loadSession()).toBeNull()
    },
  )

  it('survives storage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveSession(session)).not.toThrow()
    expect(loadSession()).toBeNull()
    expect(() => clearSession()).not.toThrow()
  })
})
