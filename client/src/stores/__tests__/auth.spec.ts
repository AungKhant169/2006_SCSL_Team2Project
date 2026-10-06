import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as authService from '@/services/authService'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import { generateAiPlan } from '@/services/roadmapAiService'
import { loadSession, saveSession } from '@/services/sessionStorage'
import { useAuthStore } from '../auth'
import { useBookmarksStore } from '../bookmarks'
import { useDirectoryStore } from '../directory'
import { useProfileStore } from '../profile'
import { useRoadmapStore } from '../roadmap'

vi.mock('@/services/authService')
vi.mock('@/services/roadmapAiService', () => ({ generateAiPlan: vi.fn() }))

const api = vi.mocked(authService)
const session = { accessToken: 'access-1', refreshToken: 'refresh-1' }

describe('auth store (UC-2.1 to UC-2.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.sessionStorage.clear()
    vi.resetAllMocks()
    vi.mocked(generateAiPlan).mockResolvedValue([])
  })

  it('starts logged out', () => {
    const auth = useAuthStore()
    expect(auth.loggedIn).toBe(false)
    expect(auth.isAdmin).toBe(false)
    expect(auth.username).toBe('')
  })

  describe('login', () => {
    it('starts a session, remembers it and reports no error', async () => {
      api.login.mockResolvedValue(session)
      const auth = useAuthStore()
      expect(await auth.login('planner2026', 'abcd123!')).toBe('')
      expect(api.login).toHaveBeenCalledWith('planner2026', 'abcd123!')
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('planner2026')
      expect(auth.isAdmin).toBe(false)
      expect(loadSession()).toEqual(session)
    })

    it('grants the Admin role to the admin account only (BR-5)', async () => {
      api.login.mockResolvedValue(session)
      const auth = useAuthStore()
      await auth.login('admin', 'abcd123!')
      expect(auth.isAdmin).toBe(true)
    })

    it('returns the server’s message and stays logged out on rejection', async () => {
      api.login.mockRejectedValue(new ApiError(401, 'The password entered is incorrect.'))
      const auth = useAuthStore()
      expect(await auth.login('planner2026', 'wrong')).toBe('The password entered is incorrect.')
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toBeNull()
    })

    it('falls back to a generic message for unexpected failures', async () => {
      api.login.mockRejectedValue(new TypeError('Failed to fetch'))
      expect(await useAuthStore().login('planner2026', 'abcd123!')).toBe(GENERIC_ERROR)
    })

    it('is busy only while the request is in flight', async () => {
      let finish!: (s: typeof session) => void
      api.login.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      const auth = useAuthStore()
      const pending = auth.login('planner2026', 'abcd123!')
      expect(auth.busy).toBe(true)
      finish(session)
      await pending
      expect(auth.busy).toBe(false)
    })

    it('points directory distances at the saved profile postal code', async () => {
      api.login.mockResolvedValue(session)
      const directory = useDirectoryStore()
      directory.setPostal('999999')
      await useAuthStore().login('planner2026', 'abcd123!')
      expect(directory.postal).toBe(useProfileStore().postal)
    })
  })

  describe('register', () => {
    it('creates the account and signs the user straight in (REQ-2.1)', async () => {
      api.register.mockResolvedValue(session)
      const auth = useAuthStore()
      expect(await auth.register('newuser1', 'abcd123!')).toBe('')
      expect(api.register).toHaveBeenCalledWith('newuser1', 'abcd123!')
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('newuser1')
    })

    it('surfaces a duplicate username message (REQ-2.15)', async () => {
      api.register.mockRejectedValue(new ApiError(409, 'This username is already taken.'))
      const auth = useAuthStore()
      expect(await auth.register('admin', 'abcd123!')).toBe('This username is already taken.')
      expect(auth.loggedIn).toBe(false)
    })
  })

  describe('logout', () => {
    it('ends the session, forgets it and tells the server', async () => {
      api.login.mockResolvedValue(session)
      api.logout.mockResolvedValue()
      const auth = useAuthStore()
      await auth.login('admin', 'abcd123!')
      await auth.logout()
      expect(auth.loggedIn).toBe(false)
      expect(auth.isAdmin).toBe(false)
      expect(auth.username).toBe('')
      expect(loadSession()).toBeNull()
      expect(api.logout).toHaveBeenCalledWith(session)
    })

    it('still logs out locally when the server cannot be reached', async () => {
      api.login.mockResolvedValue(session)
      api.logout.mockRejectedValue(new ApiError(0, GENERIC_ERROR))
      const auth = useAuthStore()
      await auth.login('planner2026', 'abcd123!')
      await auth.logout()
      expect(auth.loggedIn).toBe(false)
    })

    it('drops the account’s profile, bookmarks and roadmap so the next user starts clean', async () => {
      api.login.mockResolvedValue(session)
      api.logout.mockResolvedValue()
      const auth = useAuthStore()
      const profile = useProfileStore()
      const bookmarks = useBookmarksStore()
      const roadmap = useRoadmapStore()
      await auth.login('planner2026', 'abcd123!')
      profile.setLevel('uni')
      bookmarks.add(14)
      roadmap.generate()
      roadmap.save('Rule-Based Plan')
      await auth.logout()
      expect(profile.level).toBe('secondary')
      expect(bookmarks.ids).toEqual([2, 9])
      expect(roadmap.saved).toBeNull()
    })

    it('does nothing remote when there was no session', async () => {
      await useAuthStore().logout()
      expect(api.logout).not.toHaveBeenCalled()
    })
  })

  describe('restore', () => {
    it('does nothing without a stored session', async () => {
      const auth = useAuthStore()
      await auth.restore()
      expect(api.restoreSession).not.toHaveBeenCalled()
      expect(auth.loggedIn).toBe(false)
    })

    it('resumes a stored session and keeps any renewed tokens', async () => {
      saveSession(session)
      const renewed = { accessToken: 'access-2', refreshToken: 'refresh-2' }
      api.restoreSession.mockResolvedValue({
        session: renewed,
        identity: { id: 7, username: 'planner2026' },
      })
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(true)
      expect(auth.username).toBe('planner2026')
      expect(loadSession()).toEqual(renewed)
    })

    it('discards a session the server rejects', async () => {
      saveSession(session)
      api.restoreSession.mockRejectedValue(new ApiError(401, 'Your session has expired.'))
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toBeNull()
    })

    it('keeps the stored session when the server is merely unreachable', async () => {
      saveSession(session)
      api.restoreSession.mockRejectedValue(new ApiError(0, GENERIC_ERROR))
      const auth = useAuthStore()
      await auth.restore()
      expect(auth.loggedIn).toBe(false)
      expect(loadSession()).toEqual(session)
    })
  })
})
