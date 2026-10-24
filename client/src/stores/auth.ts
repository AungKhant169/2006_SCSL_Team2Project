import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authService from '@/services/authService'
import type { Identity, Role, Session } from '@/services/authService'
import { bindSession, SESSION_ENDED } from '@/services/authorizedRequest'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import { clearSession, loadSession, saveSession } from '@/services/sessionStorage'
import { useAdminStore } from './admin'
import { useBookmarksStore } from './bookmarks'
import { DEFAULT_POSTAL, useDirectoryStore } from './directory'
import { useProfileStore } from './profile'
import { useRoadmapStore } from './roadmap'
import { useUiStore } from './ui'

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : GENERIC_ERROR)

/** Account session (UC-2.1 to UC-2.3). Actions resolve to an error message, or '' on success. */
export const useAuthStore = defineStore('auth', () => {
  const username = ref('')
  const role = ref<Role>('user')
  const session = ref<Session | null>(null)
  const busy = ref(false)

  const loggedIn = computed(() => session.value !== null)
  const isAdmin = computed(() => loggedIn.value && role.value === 'admin')

  /** Drops the session and everything that belonged to the account. */
  function endSession() {
    session.value = null
    username.value = ''
    role.value = 'user'
    clearSession()
    useProfileStore().reset()
    useBookmarksStore().reset()
    useRoadmapStore().reset()
    useAdminStore().reset()
    useDirectoryStore().setPostal(DEFAULT_POSTAL)
  }

  // Requests of the signed-in account renew the tokens when they expire, and end the session when
  // the server refuses the renewal.
  bindSession({
    current: () => session.value,
    renewed(renewed) {
      session.value = renewed
      saveSession(renewed)
    },
    rejected() {
      endSession()
      useUiStore().setNotice(SESSION_ENDED)
    },
  })

  /** Reads what the account has stored: profile, bookmarks and roadmap. */
  async function loadAccount() {
    const profile = useProfileStore()
    await Promise.all([profile.load(), useBookmarksStore().load(), useRoadmapStore().load()])
    // Distances now default to the student's saved residential postal code.
    if (profile.postalValid) useDirectoryStore().setPostal(profile.postal)
  }

  async function start(identity: Identity, tokens: Session) {
    username.value = identity.username
    role.value = identity.role
    session.value = tokens
    saveSession(tokens)
    await loadAccount()
  }

  async function authenticate(request: () => Promise<Session>): Promise<string> {
    busy.value = true
    try {
      const tokens = await request()
      await start(await authService.identity(tokens), tokens)
      return ''
    } catch (error) {
      return messageOf(error)
    } finally {
      busy.value = false
    }
  }

  function login(name: string, password: string): Promise<string> {
    return authenticate(() => authService.login(name, password))
  }

  function register(name: string, password: string): Promise<string> {
    return authenticate(() => authService.register(name, password))
  }

  /** Ends the session locally, then tells the server to forget the refresh token. */
  async function logout() {
    const current = session.value
    endSession()
    if (current) await authService.logout(current).catch(() => undefined)
  }

  /** Resumes a session saved by an earlier page load, if it is still valid. */
  async function restore() {
    const stored = loadSession()
    if (!stored) return
    try {
      const restored = await authService.restoreSession(stored)
      await start(restored.identity, restored.session)
    } catch (error) {
      // An unreachable server is not proof the session is bad; only a rejection clears it.
      if (error instanceof ApiError && error.status !== 0) clearSession()
    }
  }

  return { username, busy, loggedIn, isAdmin, login, register, logout, restore }
})
