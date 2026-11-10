import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiRequest, ApiError } from '@/services/http'
import { DEMO_STEPS, SCRIPT_ID } from './script'

export interface DemoState {
  script_id: string
  step: number
  step_count: number
  version: number
  paused: boolean
  spotlight: boolean
  display_connected: boolean
  acknowledged_version: number
  display_message: string
  expires_in: number
}
export interface Pairing {
  id: string
  control_key: string
  display_key: string
  state: DemoState
}
interface Credentials {
  id: string
  key: string
  role: 'display' | 'control'
}
export type DemoAction =
  'next' | 'previous' | 'goto' | 'pause' | 'spotlight' | 'restart' | 'refocus'
const STORAGE_KEY = 'pathsg-demo-display'

export const useDemoSession = defineStore('demo-session', () => {
  const credentials = ref<Credentials | null>(null)
  const state = ref<DemoState | null>(null)
  const connected = ref(false)
  const busy = ref(false)
  const error = ref('')
  const ended = ref(false)
  const step = computed(() => DEMO_STEPS[state.value?.step ?? 0]!)
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0

  function accept(next: DemoState) {
    if (next.script_id !== SCRIPT_ID || next.step_count !== DEMO_STEPS.length) {
      throw new Error('The demo script has changed. Start a new session on the laptop.')
    }
    if (!state.value || next.version >= state.value.version) state.value = next
    connected.value = true
    error.value = ''
  }

  function fail(reason: unknown) {
    connected.value = false
    error.value = reason instanceof Error ? reason.message : 'Cannot connect. Retrying…'
    if (reason instanceof ApiError && [403, 404].includes(reason.status)) {
      ended.value = true
      sessionStorage.removeItem(STORAGE_KEY)
    }
    if (!(reason instanceof ApiError)) ended.value = true
  }

  async function poll(run: number) {
    const current = credentials.value
    if (!current || run !== generation) return
    try {
      const next = await apiRequest<DemoState>(`/demo/sessions/${current.id}`, {
        token: current.key,
        signal: AbortSignal.timeout(5000),
      })
      if (run !== generation) return
      accept(next)
    } catch (reason) {
      if (run !== generation) return
      fail(reason)
    }
    if (run === generation && !ended.value) timer = setTimeout(() => void poll(run), 800)
  }

  function detach() {
    generation++
    clearTimeout(timer)
    credentials.value = null
    state.value = null
    connected.value = false
    busy.value = false
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function attach(id: string, key: string, role: Credentials['role']) {
    detach()
    ended.value = false
    error.value = ''
    if (!/^[\w-]+$/.test(id) || !/^[\w-]{32,}$/.test(key)) {
      error.value = 'This pairing link is incomplete. Scan the code on the laptop again.'
      ended.value = true
      return
    }
    credentials.value = { id, key, role }
    if (role === 'display') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials.value))
    void poll(generation)
  }

  function resumeDisplay() {
    if (credentials.value) return
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Credentials | null
      if (saved?.role === 'display') attach(saved.id, saved.key, 'display')
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  async function command(action: DemoAction, index?: number) {
    const current = credentials.value
    if (!current || !state.value || busy.value || !connected.value || ended.value) return
    const run = generation
    busy.value = true
    try {
      const next = await apiRequest<DemoState>(`/demo/sessions/${current.id}/command`, {
        method: 'POST',
        token: current.key,
        signal: AbortSignal.timeout(5000),
        body: {
          action,
          version: state.value.version,
          ...(index === undefined ? {} : { step: index }),
        },
      })
      if (run === generation) accept(next)
    } catch (reason) {
      if (run !== generation) return
      if (reason instanceof ApiError && reason.status === 409) {
        error.value = reason.message
      } else fail(reason)
    } finally {
      if (run === generation) busy.value = false
    }
  }

  async function acknowledge(version: number, message: string) {
    const current = credentials.value
    if (!current || current.role !== 'display') return
    await apiRequest(`/demo/sessions/${current.id}/ack`, {
      method: 'POST',
      token: current.key,
      body: { version, message: message.slice(0, 240) },
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined)
  }

  async function end() {
    const current = credentials.value
    if (!current) return
    busy.value = true
    try {
      await apiRequest(`/demo/sessions/${current.id}`, {
        method: 'DELETE',
        token: current.key,
        signal: AbortSignal.timeout(5000),
      })
      detach()
      ended.value = true
      error.value = ''
    } catch (reason) {
      fail(reason)
    } finally {
      busy.value = false
    }
  }

  return {
    credentials,
    state,
    connected,
    busy,
    error,
    ended,
    step,
    attach,
    detach,
    resumeDisplay,
    command,
    acknowledge,
    end,
  }
})

export function createDemoSession() {
  return apiRequest<Pairing>('/demo/sessions', {
    method: 'POST',
    body: { script_id: SCRIPT_ID, step_count: DEMO_STEPS.length },
    signal: AbortSignal.timeout(8000),
  })
}

export function pairingUrl(
  pairing: Pairing,
  role: 'control' | 'display',
  origin = window.location.origin,
) {
  return `${origin}/demo/${role}/${pairing.id}#${role === 'control' ? pairing.control_key : pairing.display_key}`
}
