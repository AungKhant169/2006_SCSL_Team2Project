import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { ApiError, apiRequest } from '@/services/http'
import { DEMO_STEPS } from '../script'
import { createDemoSession, pairingUrl, useDemoSession } from '../session'
import type { DemoState, Pairing } from '../session'

vi.mock('@/services/http', async (original) => ({
  ...(await original<typeof import('@/services/http')>()),
  apiRequest: vi.fn(),
}))

const request = vi.mocked(apiRequest)
const key = 'x'.repeat(43)
const snapshot = (version = 0): DemoState => ({
  script_id: 'pathsg-v1',
  step: version,
  step_count: DEMO_STEPS.length,
  version,
  paused: false,
  spotlight: true,
  display_connected: true,
  acknowledged_version: version,
  display_message: 'Feature ready on the display.',
  expires_in: 14400,
})

describe('paired demo session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.useFakeTimers()
    request.mockReset()
    request.mockResolvedValue(snapshot())
  })
  afterEach(() => {
    useDemoSession().detach()
    vi.useRealTimers()
  })

  it('stores display pairing across reloads and keeps its key in an Authorization token', async () => {
    const demo = useDemoSession()
    demo.attach('session-one', key, 'display')
    await flushPromises()
    expect(demo.connected).toBe(true)
    expect(request).toHaveBeenCalledWith(
      '/demo/sessions/session-one',
      expect.objectContaining({ token: key }),
    )
    setActivePinia(createPinia())
    const restored = useDemoSession()
    restored.resumeDisplay()
    await flushPromises()
    expect(restored.credentials).toEqual({ id: 'session-one', key, role: 'display' })
    demo.detach()
  })

  it('does not persist the phone capability in display storage', async () => {
    useDemoSession().attach('session-one', key, 'control')
    await flushPromises()
    expect(sessionStorage.getItem('pathsg-demo-display')).toBeNull()
  })

  it('rejects incomplete links before making a request', () => {
    const demo = useDemoSession()
    demo.attach('session-one', '', 'control')
    expect(demo.ended).toBe(true)
    expect(request).not.toHaveBeenCalled()
  })

  it('recovers from a temporary network failure on the next poll', async () => {
    request.mockRejectedValueOnce(new ApiError(0, 'Network unavailable'))
    const demo = useDemoSession()
    demo.attach('session-one', key, 'control')
    await flushPromises()
    expect(demo.connected).toBe(false)
    expect(demo.ended).toBe(false)
    await vi.advanceTimersByTimeAsync(800)
    expect(demo.connected).toBe(true)
    expect(demo.error).toBe('')
  })

  it('ends an expired session and stops polling', async () => {
    request.mockRejectedValue(new ApiError(404, 'Session expired'))
    const demo = useDemoSession()
    demo.attach('session-one', key, 'display')
    await flushPromises()
    expect(demo.ended).toBe(true)
    expect(sessionStorage.getItem('pathsg-demo-display')).toBeNull()
    await vi.advanceTimersByTimeAsync(5000)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('ignores a late poll response from a detached session', async () => {
    let resolve!: (state: DemoState) => void
    request.mockReturnValueOnce(
      new Promise<DemoState>((done) => {
        resolve = done
      }),
    )
    const demo = useDemoSession()
    demo.attach('session-one', key, 'display')
    demo.detach()
    resolve(snapshot(1))
    await flushPromises()
    expect(demo.state).toBeNull()
    expect(demo.connected).toBe(false)
  })

  it('sends versioned commands and does not retry a stale Next', async () => {
    const demo = useDemoSession()
    demo.attach('session-one', key, 'control')
    await flushPromises()
    request.mockRejectedValueOnce(new ApiError(409, 'Another control changed the step.'))
    await demo.command('next')
    expect(request).toHaveBeenLastCalledWith(
      '/demo/sessions/session-one/command',
      expect.objectContaining({
        method: 'POST',
        token: key,
        body: { action: 'next', version: 0 },
      }),
    )
    expect(demo.state?.step).toBe(0)
    expect(demo.error).toContain('Another control')
    expect(demo.connected).toBe(true)
  })

  it('requires the same script on the phone and laptop', async () => {
    request.mockResolvedValueOnce({ ...snapshot(), step_count: 999 })
    const demo = useDemoSession()
    demo.attach('session-one', key, 'display')
    await flushPromises()
    expect(demo.ended).toBe(true)
    expect(demo.error).toContain('script has changed')
  })

  it('ignores an in-flight command after detaching the controller', async () => {
    const demo = useDemoSession()
    demo.attach('session-one', key, 'control')
    await flushPromises()
    let resolve!: (state: DemoState) => void
    request.mockReturnValueOnce(
      new Promise<DemoState>((done) => {
        resolve = done
      }),
    )
    const pending = demo.command('next')
    demo.detach()
    resolve(snapshot(1))
    await pending
    expect(demo.state).toBeNull()
    expect(demo.connected).toBe(false)
    expect(demo.busy).toBe(false)
  })

  it('creates the session from the running order and uses URL fragments for pairing keys', async () => {
    await createDemoSession()
    expect(request).toHaveBeenCalledWith(
      '/demo/sessions',
      expect.objectContaining({
        body: { script_id: 'pathsg-v1', step_count: DEMO_STEPS.length },
      }),
    )
    const pair: Pairing = {
      id: 'session-one',
      control_key: 'phone-key',
      display_key: 'screen-key',
      state: snapshot(),
    }
    const url = new URL(pairingUrl(pair, 'control', 'https://demo.example.com'))
    expect(url.search).toBe('')
    expect(url.hash).toBe('#phone-key')
    expect(url.pathname).toBe('/demo/control/session-one')
  })
})
