import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { animateFocus, focusRectangle } from '../focusMotion'

describe('focus travel', () => {
  let target: HTMLElement
  let scroll = 0
  beforeEach(() => {
    vi.useFakeTimers()
    scroll = 0
    target = document.createElement('section')
    document.body.append(target)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll)
    vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      scroll = (options as ScrollToOptions).top ?? scroll
    })
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(3000)
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => ({
      top: 1400 - scroll,
      left: 50,
      width: 800,
      height: 260,
      bottom: 1660 - scroll,
      right: 850,
      x: 50,
      y: 1400 - scroll,
      toJSON() {},
    }))
  })
  afterEach(() => {
    target.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('travels through intermediate positions and resolves only after settling', async () => {
    const frame = vi.fn()
    const done = vi.fn()
    const from = { top: 25, left: 10, width: 300, height: 100 }
    const moving = animateFocus(target, from, frame, new AbortController().signal).then(done)
    await vi.advanceTimersByTimeAsync(320)
    expect(scroll).toBeGreaterThan(0)
    expect(scroll).toBeLessThan(1000)
    expect(frame.mock.lastCall?.[0].width).toBeGreaterThan(from.width)
    expect(frame.mock.lastCall?.[0].width).toBeLessThan(816)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    await moving
    expect(done).toHaveBeenCalledWith(true)
    expect(frame.mock.lastCall?.[0]).toEqual(focusRectangle(target))
  })

  it('stops scrolling immediately when a newer focus or pause cancels travel', async () => {
    const controller = new AbortController()
    const moving = animateFocus(target, null, vi.fn(), controller.signal)
    await vi.advanceTimersByTimeAsync(200)
    controller.abort()
    const stoppedAt = scroll
    expect(await moving).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(scroll).toBe(stoppedAt)
  })

  it('honours reduced motion without scheduling animation frames', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const frame = vi.fn()
    expect(await animateFocus(target, null, frame, new AbortController().signal)).toBe(true)
    expect(scroll).toBeGreaterThan(1000)
    expect(frame).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start a canceled transition', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await animateFocus(target, null, vi.fn(), controller.signal)).toBe(false)
    expect(scroll).toBe(0)
  })
})
