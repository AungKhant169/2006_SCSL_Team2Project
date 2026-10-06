import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authService from '@/services/authService'
import type { Session } from '@/services/authService'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import { clearSession, loadSession, saveSession } from '@/services/sessionStorage'
import { useAdminStore } from './admin'
import { useBookmarksStore } from './bookmarks'
import { useDirectoryStore } from './directory'
import { useProfileStore } from './profile'
import { useRoadmapStore } from './roadmap'

/**
 * The API does not expose account roles yet, so the administrator is identified by this
 * reserved username. Swap for a role from the identity payload once the backend provides one.
 */
export const ADMIN_USERNAME = 'admin'

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : GENERIC_ERROR)

/** Account session (UC-2.1 to UC-2.3). Actions resolve to an error message, or '' on success. */
export const useAuthStore = defineStore('auth', () => {
  const username = ref('')
  const session = ref<Session | null>(null)
  const busy = ref(false)

  const loggedIn = computed(() => session.value !== null)
  const isAdmin = computed(() => loggedIn.value && username.value.toLowerCase() === ADMIN_USERNAME)

  function start(name: string, tokens: Session) {
    username.value = name
    session.value = tokens
    saveSession(tokens)
    // Distances now default to the student's saved residential postal code.
    useDirectoryStore().setPostal(useProfileStore().postal)
  }

  async function authenticate(request: () => Promise<Session>, name: string): Promise<string> {
    busy.value = true
    try {
      start(name, await request())
      return ''
    } catch (error) {
      return messageOf(error)
    } finally {
      busy.value = false
    }
  }

  function login(name: string, password: string): Promise<string> {
    return authenticate(() => authService.login(name, password), name)
  }

  function register(name: string, password: string): Promise<string> {
    return authenticate(() => authService.register(name, password), name)
  }

  /** Ends the session and drops everything that belonged to the account. */
  async function logout() {
    const current = session.value
    session.value = null
    username.value = ''
    clearSession()
    useProfileStore().reset()
    useBookmarksStore().reset()
    useRoadmapStore().reset()
    useAdminStore().reset()
    if (current) await authService.logout(current).catch(() => undefined)
  }

  /** Resumes a session saved by an earlier page load, if it is still valid. */
  async function restore() {
    const stored = loadSession()
    if (!stored) return
    try {
      const restored = await authService.restoreSession(stored)
      start(restored.identity.username, restored.session)
    } catch (error) {
      // An unreachable server is not proof the session is bad; only a rejection clears it.
      if (error instanceof ApiError && error.status !== 0) clearSession()
    }
  }

  return { username, busy, loggedIn, isAdmin, login, register, logout, restore }
})
