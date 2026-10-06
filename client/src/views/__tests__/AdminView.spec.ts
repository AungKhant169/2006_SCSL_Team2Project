import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { DatasetUpdateError, updateDataset } from '@/services/datasetService'
import { useUiStore } from '@/stores/ui'
import { mountWithApp } from '@/test/helpers'
import AdminView from '../AdminView.vue'

vi.mock('@/services/datasetService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/datasetService')>()),
  updateDataset: vi.fn(),
}))
const pipeline = vi.mocked(updateDataset)

const mountAdmin = () => mountWithApp(AdminView, { route: '/admin', signedInAs: 'admin' })
const trigger = (w: VueWrapper) => w.get('button')
const tiles = (w: VueWrapper) =>
  Object.fromEntries(
    w.findAll('.panel').map((t) => {
      const [label, value] = t.findAll('span, div').map((e) => e.text())
      return [label, value]
    }),
  )

function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AdminView (UC-5.1)', () => {
  beforeEach(() => pipeline.mockReset())
  afterEach(() => vi.unstubAllGlobals())

  describe('idle', () => {
    it('describes the pipeline and shows the current dataset state', async () => {
      const { wrapper } = await mountAdmin()
      expect(wrapper.get('h1').text()).toBe('Admin panel')
      expect(wrapper.text()).toContain('Restricted to accounts with the Admin role.')
      expect(wrapper.text()).toContain('Rolled back entirely on any failure.')
      expect(wrapper.text()).toContain('11 Sep 2026, 2:05 am')
      expect(wrapper.text()).toContain('2,418')
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Idle')
    })

    it('offers an enabled Update Dataset button', async () => {
      const { wrapper } = await mountAdmin()
      expect(trigger(wrapper).text()).toBe('Update Dataset')
      expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain(
        'Completes within 10 seconds; writes commit as one transaction.',
      )
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('while running (REQ-5.2)', () => {
    it('locks the button, shows progress and the status, and ignores another click', async () => {
      const run = deferred()
      pipeline.mockReturnValue(run.promise)
      const { wrapper } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      expect(trigger(wrapper).text()).toBe('Updating dataset…')
      expect(trigger(wrapper).attributes('disabled')).toBeDefined()
      expect(trigger(wrapper).find('[role="status"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Update running')
      expect(wrapper.text()).toContain('Button locked until the transaction completes or aborts.')
      await trigger(wrapper).trigger('click')
      expect(pipeline).toHaveBeenCalledOnce()
      run.resolve()
      await flushPromises()
    })
  })

  describe('success (REQ-5.6)', () => {
    it('prints the success banner, refreshes the counters and re-enables the button', async () => {
      pipeline.mockResolvedValue()
      const { wrapper } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe(
        'Database updated successfully with the latest Singapore school data',
      )
      expect(wrapper.text()).toContain('2,424')
      expect(wrapper.text()).not.toContain('11 Sep 2026, 2:05 am')
      expect(trigger(wrapper).text()).toBe('Update Dataset')
      expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Idle')
    })

    it('hides the banner again when the next run starts', async () => {
      pipeline.mockResolvedValue()
      const { wrapper } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const run = deferred()
      pipeline.mockReturnValue(run.promise)
      await trigger(wrapper).trigger('click')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      run.resolve()
      await flushPromises()
    })
  })

  describe('failures leave existing records untouched (REQ-5.5, REQ-5.8, REQ-5.9)', () => {
    it.each([
      ['timeout', 'Unable to reach API. Please try again.'],
      ['parse', 'Unable to process dataset format. Please check source data and try again.'],
    ] as const)(
      'a %s raises a popup, re-enables the button and shows no banner',
      async (kind, body) => {
        pipeline.mockRejectedValueOnce(new DatasetUpdateError(kind))
        const { wrapper } = await mountAdmin()
        await trigger(wrapper).trigger('click')
        await flushPromises()
        const ui = useUiStore()
        expect(ui.modalDefinition?.title).toBe('Database Update Failed')
        expect(ui.modalDefinition?.body).toBe(body)
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
        expect(wrapper.text()).toContain('2,418')
        expect(wrapper.text()).toContain('11 Sep 2026, 2:05 am')
      },
    )

    it('the button works again afterwards', async () => {
      pipeline.mockRejectedValueOnce(new DatasetUpdateError('timeout')).mockResolvedValueOnce()
      const { wrapper } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      useUiStore().closeModal()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Database updated successfully')
    })
  })

  it('reads the status tiles correctly', async () => {
    const { wrapper } = await mountAdmin()
    expect(tiles(wrapper)).toMatchObject({
      'Last successful update': '11 Sep 2026, 2:05 am',
      'Records in database': '2,418',
      Status: 'Idle',
    })
  })
})
