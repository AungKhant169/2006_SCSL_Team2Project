import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminOutcome } from '../prototypeFlags'
import { DatasetUpdateError, updateDataset } from '../datasetService'

vi.mock('../prototypeFlags', () => ({ adminOutcome: vi.fn() }))

describe('datasetService', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves once the pipeline commits', async () => {
    vi.mocked(adminOutcome).mockReturnValue('success')
    const run = updateDataset()
    await vi.advanceTimersByTimeAsync(2000)
    await expect(run).resolves.toBeUndefined()
  })

  it.each([
    ['timeout', 'Unable to reach API.'],
    ['parse', 'Unable to process dataset format.'],
  ] as const)('aborts with a %s error', async (outcome, message) => {
    vi.mocked(adminOutcome).mockReturnValue(outcome)
    const run = updateDataset()
    const assertion = expect(run).rejects.toMatchObject({ kind: outcome, message })
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
    await expect(run).rejects.toBeInstanceOf(DatasetUpdateError)
  })
})
