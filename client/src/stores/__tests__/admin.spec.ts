import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DatasetUpdateError, updateDataset } from '@/services/datasetService'
import { DATASET_SUCCESS_MESSAGE, useAdminStore } from '../admin'
import { useUiStore } from '../ui'

vi.mock('@/services/datasetService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/datasetService')>()),
  updateDataset: vi.fn(),
}))

const pipeline = vi.mocked(updateDataset)

function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('admin store (UC-5.1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pipeline.mockReset()
  })

  it('starts idle with the previous update details', () => {
    const a = useAdminStore()
    expect(a.busy).toBe(false)
    expect(a.message).toBe('')
    expect(a.lastUpdate).toBe('11 Sep 2026, 2:05 am')
    expect(a.recordCount).toBe(2418)
  })

  it('locks the trigger while the pipeline runs and ignores a second click (REQ-5.2)', async () => {
    const run = deferred()
    pipeline.mockReturnValue(run.promise)
    const a = useAdminStore()
    const first = a.runUpdate()
    expect(a.busy).toBe(true)
    await a.runUpdate()
    expect(pipeline).toHaveBeenCalledOnce()
    run.resolve()
    await first
    expect(a.busy).toBe(false)
  })

  it('shows the success banner and refreshes the counters on commit (REQ-5.6)', async () => {
    pipeline.mockResolvedValue()
    const a = useAdminStore()
    await a.runUpdate()
    expect(a.message).toBe(DATASET_SUCCESS_MESSAGE)
    expect(a.message).toBe('Database updated successfully with the latest Singapore school data')
    expect(a.recordCount).toBe(2424)
    expect(a.lastUpdate).not.toBe('11 Sep 2026, 2:05 am')
  })

  it('clears the previous banner when a new run starts', async () => {
    pipeline.mockResolvedValue()
    const a = useAdminStore()
    await a.runUpdate()
    const run = deferred()
    pipeline.mockReturnValue(run.promise)
    const next = a.runUpdate()
    expect(a.message).toBe('')
    run.resolve()
    await next
  })

  it.each(['timeout', 'parse'] as const)(
    'a %s failure aborts, unlocks the button and raises the matching popup (REQ-5.8, REQ-5.9)',
    async (kind) => {
      pipeline.mockRejectedValue(new DatasetUpdateError(kind))
      const a = useAdminStore()
      const ui = useUiStore()
      await a.runUpdate()
      expect(a.busy).toBe(false)
      expect(a.message).toBe('')
      expect(a.recordCount).toBe(2418)
      expect(a.lastUpdate).toBe('11 Sep 2026, 2:05 am')
      expect(ui.modal?.id).toBe(kind)
      expect(ui.modalDefinition?.title).toBe('Database Update Failed')
    },
  )

  it('treats an unexpected failure like an unreachable API', async () => {
    pipeline.mockRejectedValue(new Error('network down'))
    const ui = useUiStore()
    await useAdminStore().runUpdate()
    expect(ui.modal?.id).toBe('timeout')
  })

  it('can run again after a failure', async () => {
    pipeline.mockRejectedValueOnce(new DatasetUpdateError('parse')).mockResolvedValueOnce()
    const a = useAdminStore()
    await a.runUpdate()
    await a.runUpdate()
    expect(a.message).toBe(DATASET_SUCCESS_MESSAGE)
  })

  it('reset clears the banner', async () => {
    pipeline.mockResolvedValue()
    const a = useAdminStore()
    await a.runUpdate()
    a.reset()
    expect(a.message).toBe('')
  })
})
