import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiOutcome } from '../prototypeFlags'
import { AI_TIMEOUT_MS, generateAiPlan } from '../roadmapAiService'

vi.mock('../prototypeFlags', () => ({ aiOutcome: vi.fn() }))

describe('roadmapAiService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(aiOutcome).mockReturnValue('success')
  })
  afterEach(() => vi.useRealTimers())

  it('resolves with school ids in benchmark order after the simulated delay', async () => {
    const result = generateAiPlan('secondary')
    await vi.advanceTimersByTimeAsync(2000)
    // Lowest PSLE AL cut-off first: RI (6), CGSS (8), BPGHS (11), SGSS (15)
    await expect(result).resolves.toEqual([5, 6, 7, 8])
  })

  it('stays pending until the module responds', async () => {
    let settled = false
    generateAiPlan('primary').then(
      () => (settled = true),
      () => (settled = true),
    )
    await vi.advanceTimersByTimeAsync(1000)
    expect(settled).toBe(false)
  })

  it('rejects when the AI module errors (REQ-3.8)', async () => {
    vi.mocked(aiOutcome).mockReturnValue('error')
    const result = generateAiPlan('secondary')
    const assertion = expect(result).rejects.toThrow(/unavailable/)
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
  })

  it('has a five second threshold (PERF-7)', () => {
    expect(AI_TIMEOUT_MS).toBe(5000)
  })
})
