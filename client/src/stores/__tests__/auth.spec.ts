import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GENERIC_ERROR } from '@/services/http'
import { loadSession } from '@/services/sessionStorage'
import { jsonResponse, stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { useAuthStore } from '../auth'
import { useBookmarksStore } from '../bookmarks'
import { DEFAULT_POSTAL, useDirectoryStore } from '../directory'
import { useProfileStore } from '../profile'
import { useRoadmapStore } from '../roadmap'
import { useUiStore } from '../ui'

describe('auth store (UC-2.1 to UC-2.3)', () => {
  let api: FakeApi

  beforeEach(() => {
    setActivePinia(createPinia())
    window.sessionStorage.clear()
    api = stubApi()
  })

  it('starts logged out', () => {
    const auth = useAuthStore()
    expect(auth.loggedIn).toBe(false)
    expect(auth.isAdmin).toBe(false)
    expect(auth.username).toBe('')
  })

  describe('login', () => {
    it('starts a session, remembers it and reports no error', async () => {
      const auth = useAuthStore()
      expect(await auth.login('planner2026', 'abcd123!')).toBe('')
      expect(api.callsTo('POST /user/login')[0]?.body).toEqual({
        username: 'planner2026',
        password: 'abcd123!',
      })
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('planner2026')
      expect(auth.isAdmin).toBe(false)
      expect(loadSession()).toMatchObject({ accessToken: expect.stringContaining('access') })
    })

    it('takes the Administrator role from the server, not from the name (BR-5)', async () => {
      const auth = useAuthStore()
      await auth.login('admin', 'abcd123!')
      expect(auth.isAdmin).toBe(true)
    })

    it('does not treat an account named admin as an administrator unless the server says so', async () => {
      api.override('GET /user/identity', () =>
        jsonResponse({ id: 2, username: 'admin', role: 'user' }),
      )
      const auth = useAuthStore()
      await auth.login('admin', 'abcd123!')
      expect(auth.loggedIn).toBe(true)
      expect(auth.isAdmin).toBe(false)
    })

    it('returns the server’s message and stays logged out on rejection', async () => {
      api.override('POST /user/login', () =>
        jsonResponse({ detail: 'The password entered is incorrect. Please try again.' }, 401),
      )
      const auth = useAuthStore()
      expect(await auth.login('planner2026', 'wrong')).toBe(
        'The password entered is incorrect. Please try again.',
      )
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toBeNull()
    })

    it('falls back to a generic message for unexpected failures', async () => {
      api.override('POST /user/login', () => {
        throw new TypeError('Failed to fetch')
      })
      expect(await useAuthStore().login('planner2026', 'abcd123!')).toBe(GENERIC_ERROR)
    })

    it('is busy only while the request is in flight', async () => {
      const release = api.hold('POST /user/login')
      const auth = useAuthStore()
      const pending = auth.login('planner2026', 'abcd123!')
      expect(auth.busy).toBe(true)
      release()
      await pending
      expect(auth.busy).toBe(false)
    })

    it('loads the profile, bookmarks and roadmap the account has stored', async () => {
      api.profiles['planner2026'] = {
        level: 'primary',
        score_a: null,
        score_b: null,
        postal: '119077',
        primary_result: 'None',
      }
      api.bookmark('planner2026', 2, 9)
      api.roadmaps['planner2026'] = { stage: 'primary', source: 'Rule-Based Plan', choices: [2] }
      await useAuthStore().login('planner2026', 'abcd123!')
      expect(useProfileStore().level).toBe('primary')
      expect(useBookmarksStore().ids).toEqual([2, 9])
      expect(useRoadmapStore().saved?.choices).toEqual([2])
    })

    it('points directory distances at the saved profile postal code', async () => {
      api.profiles['planner2026'] = {
        level: 'secondary',
        score_a: 8,
        score_b: null,
        postal: '119077',
        primary_result: 'None',
      }
      const directory = useDirectoryStore()
      await useAuthStore().login('planner2026', 'abcd123!')
      expect(directory.postal).toBe('119077')
    })

    it('keeps the directory’s postal code when the account has none saved yet', async () => {
      const directory = useDirectoryStore()
      directory.setPostal('600000')
      await useAuthStore().login('planner2026', 'abcd123!')
      expect(directory.postal).toBe('600000')
    })

    it('still logs in when the account’s data cannot be read', async () => {
      api.override('GET /profile', () => {
        throw new TypeError('Failed to fetch')
      })
      api.override('GET /bookmark', () => {
        throw new TypeError('Failed to fetch')
      })
      api.override('GET /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      const auth = useAuthStore()
      expect(await auth.login('planner2026', 'abcd123!')).toBe('')
      expect(auth.loggedIn).toBe(true)
    })
  })

  describe('register', () => {
    it('creates the account and signs the user straight in (REQ-2.1)', async () => {
      const auth = useAuthStore()
      expect(await auth.register('newuser1', 'abcd123!')).toBe('')
      expect(api.callsTo('POST /user/register')).toHaveLength(1)
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('newuser1')
    })

    it('surfaces a duplicate username message (REQ-2.15)', async () => {
      api.override('POST /user/register', () =>
        jsonResponse({ detail: 'This username is already taken.' }, 409),
      )
      const auth = useAuthStore()
      expect(await auth.register('admin', 'abcd123!')).toBe('This username is already taken.')
      expect(auth.loggedIn).toBe(false)
    })
  })

  describe('logout', () => {
    it('ends the session, forgets it and tells the server', async () => {
      const auth = useAuthStore()
      await auth.login('admin', 'abcd123!')
      const { refreshToken } = loadSession()!
      await auth.logout()
      expect(auth.loggedIn).toBe(false)
      expect(auth.isAdmin).toBe(false)
      expect(auth.username).toBe('')
      expect(loadSession()).toBeNull()
      expect(api.callsTo('POST /user/logout')[0]?.body).toMatchObject({
        refresh_token: refreshToken,
      })
    })

    it('still logs out locally when the server cannot be reached', async () => {
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      api.override('POST /user/logout', () => {
        throw new TypeError('Failed to fetch')
      })
      await auth.logout()
      expect(auth.loggedIn).toBe(false)
    })

    it('drops the account’s profile, bookmarks, roadmap and directory anchor so the next user starts clean', async () => {
      api.profiles['planner2026'] = {
        level: 'uni',
        score_a: 3.5,
        score_b: null,
        postal: '119077',
        primary_result: 'None',
      }
      api.bookmark('planner2026', 2)
      api.roadmaps['planner2026'] = { stage: 'primary', source: 'Rule-Based Plan', choices: [2] }
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      await auth.logout()
      expect(useProfileStore().level).toBe('secondary')
      expect(useProfileStore().postal).toBe('')
      expect(useBookmarksStore().ids).toEqual([])
      expect(useRoadmapStore().saved).toBeNull()
      expect(useDirectoryStore().postal).toBe(DEFAULT_POSTAL)
    })

    it('does nothing remote when there was no session', async () => {
      await useAuthStore().logout()
      expect(api.callsTo('POST /user/logout')).toHaveLength(0)
    })
  })

  describe('restore', () => {
    async function storedSession() {
      const other = useAuthStore()
      await other.login('planner2026', 'abcd123!')
      return loadSession()!
    }

    it('does nothing without a stored session', async () => {
      const auth = useAuthStore()
      await auth.restore()
      expect(api.fetch).not.toHaveBeenCalled()
      expect(auth.loggedIn).toBe(false)
    })

    it('resumes a stored session, with its role and stored data', async () => {
      api.bookmark('admin', 2)
      // Logging in leaves the session in storage, as a page reload would find it.
      await useAuthStore().login('admin', 'abcd123!')
      setActivePinia(createPinia())
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('admin')
      expect(auth.isAdmin).toBe(true)
      expect(useBookmarksStore().ids).toEqual([2])
    })

    it('renews an expired access token and keeps the new tokens', async () => {
      const first = await storedSession()
      api.expireAccessTokens()
      setActivePinia(createPinia())
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(true)
      expect(loadSession()?.accessToken).not.toBe(first.accessToken)
    })

    it('discards a session the server rejects', async () => {
      await storedSession()
      api.expireAccessTokens()
      api.override('POST /user/refresh', () =>
        jsonResponse({ detail: 'Your session has expired. Please log in again.' }, 401),
      )
      setActivePinia(createPinia())
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toBeNull()
    })

    it('keeps the stored session when the server is merely unreachable', async () => {
      const stored = await storedSession()
      api.override('GET /user/identity', () => {
        throw new TypeError('Failed to fetch')
      })
      setActivePinia(createPinia())
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toEqual(stored)
    })
  })

  describe('a session that expires while in use', () => {
    it('renews the tokens quietly and carries on', async () => {
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      const before = loadSession()!
      api.expireAccessTokens()
      await useBookmarksStore().add(2)
      expect(useBookmarksStore().has(2)).toBe(true)
      expect(auth.loggedIn).toBe(true)
      expect(loadSession()?.accessToken).not.toBe(before.accessToken)
      expect(api.callsTo('POST /user/refresh')).toHaveLength(1)
    })

    it('shares one renewal between requests that fail together', async () => {
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      api.expireAccessTokens()
      await Promise.all([
        useProfileStore().load(),
        useBookmarksStore().load(),
        useRoadmapStore().load(),
      ])
      expect(api.callsTo('POST /user/refresh')).toHaveLength(1)
      expect(auth.loggedIn).toBe(true)
    })

    it('signs the user out with a notice when the server refuses to renew it', async () => {
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      api.expireAccessTokens()
      api.override('POST /user/refresh', () =>
        jsonResponse({ detail: 'Your session has expired. Please log in again.' }, 401),
      )
      await useBookmarksStore().add(2)
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toBeNull()
      expect(useUiStore().notice).toBe('Your session has expired. Please log in again.')
    })
  })
})
