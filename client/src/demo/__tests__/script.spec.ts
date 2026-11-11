import { describe, expect, it } from 'vitest'
import { DEMO_STEPS, DEMO_TOTAL_SECONDS, plannedWindow, presenterOf } from '../script'

describe('two-presenter live demo brief', () => {
  it('covers only the ten numbered demonstration features in order', () => {
    expect([...new Set(DEMO_STEPS.map((step) => step.feature))]).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(DEMO_STEPS.map((step) => step.feature)).toEqual(
      DEMO_STEPS.map((step) => step.feature).sort((a, b) => a - b),
    )
    expect(DEMO_STEPS.some((step) => step.prepare === 'logout' && step.feature === 9)).toBe(true)
  })

  it('reserves at least thirteen minutes with equal time and the requested handoff', () => {
    const first = DEMO_STEPS.filter((step) => presenterOf(step) === 1).reduce(
      (total, step) => total + step.seconds,
      0,
    )
    const second = DEMO_STEPS.filter((step) => presenterOf(step) === 2).reduce(
      (total, step) => total + step.seconds,
      0,
    )
    expect(DEMO_TOTAL_SECONDS).toBeGreaterThanOrEqual(13 * 60)
    expect(first).toBe(second)
    expect([first, second]).toEqual([420, 420])
    expect(plannedWindow(DEMO_STEPS.findIndex((step) => step.feature === 8))).toMatch(/^07:00/)
    expect(plannedWindow(DEMO_STEPS.length - 1)).toMatch(/14:00$/)
    expect(
      DEMO_STEPS.filter((step) => step.feature <= 7).every((step) => presenterOf(step) === 1),
    ).toBe(true)
  })
})
