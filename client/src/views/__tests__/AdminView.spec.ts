import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useUiStore } from '@/stores/ui'
import { DATASET_EXPORT_FILENAME, DATASET_LAST_UPDATE, stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import { saveFile } from '@/utils/download'
import { formatTimestamp } from '@/utils/format'
import AdminView from '../AdminView.vue'

// jsdom cannot download a file; what the page hands to the browser is checked instead.
vi.mock('@/utils/download', () => ({ saveFile: vi.fn() }))

async function mountAdmin() {
  const mounted = await mountWithApp(AdminView, {
    route: '/admin',
    signedInAs: 'admin',
    api: stubApi(),
  })
  await flushPromises()
  return mounted
}

const trigger = (w: VueWrapper) => w.get('[data-testid="admin-update"]')
const tiles = (w: VueWrapper) =>
  Object.fromEntries(
    w.findAll('.panel').map((t) => {
      const [label, value] = t.findAll('span, div').map((e) => e.text())
      return [label, value]
    }),
  )

/** Chooses files in the picker the way a browser would. */
async function pick(w: VueWrapper, ...names: string[]) {
  const input = w.get<HTMLInputElement>('input[type="file"]')
  const files = names.map((name) => new File(['a,b'], name, { type: 'text/csv' }))
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

describe('AdminView (UC-5.1)', () => {
  describe('idle', () => {
    it('describes the pipeline and shows the current dataset state', async () => {
      const { wrapper } = await mountAdmin()
      expect(wrapper.get('h1').text()).toBe('Admin panel')
      expect(wrapper.text()).toContain('Restricted to accounts with the Admin role.')
      expect(wrapper.text()).toContain('rolled back entirely on any failure.')
      expect(wrapper.text()).toContain(formatTimestamp(DATASET_LAST_UPDATE))
      expect(wrapper.text()).toContain('2,418')
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Idle')
    })

    it('reads the dataset status from the server', async () => {
      const { api } = await mountAdmin()
      expect(api.callsTo('GET /admin/dataset')).toHaveLength(1)
    })

    it('shows dashes until the status arrives, and "Not recorded" when it has no date', async () => {
      const api = stubApi()
      api.datasetLastUpdate = null
      const release = api.hold('GET /admin/dataset')
      const { wrapper } = await mountWithApp(AdminView, {
        route: '/admin',
        signedInAs: 'admin',
        api,
      })
      expect(tiles(wrapper)['Records in database']).toBe('—')
      release()
      await flushPromises()
      expect(tiles(wrapper)['Records in database']).toBe('2,418')
      expect(tiles(wrapper)['Last successful update']).toBe('Not recorded')
    })

    it('offers a file picker for CSV files and an enabled Update Dataset button', async () => {
      const { wrapper } = await mountAdmin()
      const input = wrapper.get('input[type="file"]')
      expect(input.attributes('accept')).toBe('.csv,text/csv')
      expect(input.attributes('multiple')).toBeDefined()
      expect(trigger(wrapper).text()).toBe('Update Dataset')
      expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain(
        'Completes within 10 seconds; writes commit as one transaction.',
      )
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('picking files', () => {
    it('lists them, and sends only those left after one is removed', async () => {
      const { wrapper, api } = await mountAdmin()
      await pick(wrapper, 'moe.csv', 'ccas.csv')
      expect(wrapper.findAll('li').map((row) => row.text())).toEqual([
        expect.stringContaining('moe.csv'),
        expect.stringContaining('ccas.csv'),
      ])
      await wrapper.get('[aria-label="Remove moe.csv"]').trigger('click')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const form = api.callsTo('POST /admin/dataset/update')[0]!.body as FormData
      expect(form.getAll('files').map((f) => (f as File).name)).toEqual(['ccas.csv'])
    })

    it('keeps the list empty again once a run has used the files', async () => {
      const { wrapper } = await mountAdmin()
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.find('li').exists()).toBe(false)
    })
  })

  describe('without a file', () => {
    it('asks for one beside the form, with the prescribed message (REQ-5.8)', async () => {
      const { wrapper, api } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe(
        'Please select a CSV file before updating the database.',
      )
      expect(useUiStore().modal).toBeNull()
      expect(api.callsTo('POST /admin/dataset/update')[0]?.body).toBeInstanceOf(FormData)
    })

    it('takes the message away once files are picked', async () => {
      const { wrapper } = await mountAdmin()
      await trigger(wrapper).trigger('click')
      await flushPromises()
      await pick(wrapper, 'moe.csv')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('while running (REQ-5.2)', () => {
    it('locks the button, shows progress and the status, and ignores another click', async () => {
      const { wrapper, api } = await mountAdmin()
      const release = api.hold('POST /admin/dataset/update')
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      expect(trigger(wrapper).text()).toBe('Updating dataset…')
      expect(trigger(wrapper).attributes('disabled')).toBeDefined()
      expect(trigger(wrapper).find('[role="status"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Update running')
      expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Button locked until the transaction completes or aborts.')
      await trigger(wrapper).trigger('click')
      release()
      await flushPromises()
      expect(api.callsTo('POST /admin/dataset/update')).toHaveLength(1)
    })
  })

  describe('success (REQ-5.6)', () => {
    it('sends the files, prints the success banner, refreshes the counters and re-enables the button', async () => {
      const { wrapper, api } = await mountAdmin()
      await pick(wrapper, 'moe.csv', 'ccas.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const form = api.callsTo('POST /admin/dataset/update')[0]!.body as FormData
      expect(form.getAll('files').map((f) => (f as File).name)).toEqual(['moe.csv', 'ccas.csv'])
      expect(wrapper.get('[role="alert"]').text()).toBe(
        'Database updated successfully with the latest Singapore school data',
      )
      expect(wrapper.text()).toContain('2,424')
      expect(wrapper.text()).not.toContain(formatTimestamp(DATASET_LAST_UPDATE))
      expect(trigger(wrapper).text()).toBe('Update Dataset')
      expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.get('[data-testid="admin-status"]').text()).toBe('Idle')
    })

    it('clears the chosen files, so they are not sent twice by mistake', async () => {
      const { wrapper } = await mountAdmin()
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.get<HTMLInputElement>('input[type="file"]').element.value).toBe('')
    })

    it('hides the banner again when the next run starts', async () => {
      const { wrapper, api } = await mountAdmin()
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const release = api.hold('POST /admin/dataset/update')
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      release()
      await flushPromises()
    })
  })

  describe('failures leave existing records untouched (REQ-5.5, REQ-5.8, REQ-5.9)', () => {
    it('an unreachable server raises the "Unable to reach API" popup', async () => {
      const { wrapper, api } = await mountAdmin()
      api.override('POST /admin/dataset/update', () => {
        throw new TypeError('Failed to fetch')
      })
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const ui = useUiStore()
      expect(ui.modalDefinition?.title).toBe('Database Update Failed')
      expect(ui.modalDefinition?.body).toBe('Unable to reach API. Please try again.')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain('2,418')
      expect(wrapper.text()).toContain(formatTimestamp(DATASET_LAST_UPDATE))
    })

    it('a file that cannot be processed raises the matching popup', async () => {
      const { wrapper, api } = await mountAdmin()
      api.datasetOutcome = 'parse'
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('parse')
      expect(ui.modalDefinition?.body).toBe(
        'Unable to process dataset format. Please check source data and try again.',
      )
      expect(wrapper.text()).toContain('2,418')
    })

    it('the button works again afterwards', async () => {
      const { wrapper, api } = await mountAdmin()
      api.datasetOutcome = 'parse'
      await pick(wrapper, 'moe.csv')
      await trigger(wrapper).trigger('click')
      await flushPromises()
      useUiStore().closeModal()
      api.datasetOutcome = 'success'
      await trigger(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Database updated successfully')
    })
  })

  it('reads the status tiles correctly', async () => {
    const { wrapper } = await mountAdmin()
    expect(tiles(wrapper)).toMatchObject({
      'Last successful update': formatTimestamp(DATASET_LAST_UPDATE),
      'Records in database': '2,418',
      Status: 'Idle',
    })
  })
})

describe('Database export (UC-5.2)', () => {
  const exportButton = (w: VueWrapper) => w.get('[data-testid="admin-export"]')

  beforeEach(() => vi.mocked(saveFile).mockClear())

  it('offers an Export Database button and says what the file holds', async () => {
    const { wrapper } = await mountAdmin()
    expect(wrapper.text()).toContain('Export school dataset')
    expect(wrapper.text()).toContain(
      'User accounts, saved roadmaps and reviews are never included.',
    )
    expect(wrapper.text()).toContain('pathsg_schools_YYYYMMDD.csv')
    expect(exportButton(wrapper).text()).toBe('Export Database')
    expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('downloads the file the server names, without a popup or a banner (REQ-5.15)', async () => {
    const { wrapper, api } = await mountAdmin()
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    expect(api.callsTo('GET /admin/dataset/export')).toHaveLength(1)
    expect(saveFile).toHaveBeenCalledOnce()
    expect(vi.mocked(saveFile).mock.calls[0]![1]).toBe(DATASET_EXPORT_FILENAME)
    expect(useUiStore().modal).toBeNull()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('locks the button and shows progress while the file is fetched', async () => {
    const { wrapper, api } = await mountAdmin()
    const release = api.hold('GET /admin/dataset/export')
    await exportButton(wrapper).trigger('click')
    expect(exportButton(wrapper).text()).toBe('Exporting…')
    expect(exportButton(wrapper).attributes('disabled')).toBeDefined()
    expect(exportButton(wrapper).find('[role="status"]').exists()).toBe(true)
    // The dataset update is a separate job and stays available.
    expect(trigger(wrapper).attributes('disabled')).toBeUndefined()
    release()
    await flushPromises()
    expect(exportButton(wrapper).text()).toBe('Export Database')
    expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(api.callsTo('GET /admin/dataset/export')).toHaveLength(1)
  })

  it('an empty or unreachable database raises the "Export Failed" popup and saves nothing', async () => {
    const { wrapper, api } = await mountAdmin()
    api.exportOutcome = 'unavailable'
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    const ui = useUiStore()
    expect(ui.modal?.id).toBe('export')
    expect(ui.modalDefinition?.title).toBe('Export Failed')
    expect(ui.modalDefinition?.body).toBe('Unable to retrieve school data at this time.')
    expect(saveFile).not.toHaveBeenCalled()
    expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('the button works again after a failure', async () => {
    const { wrapper, api } = await mountAdmin()
    api.exportOutcome = 'unavailable'
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    useUiStore().closeModal()
    api.exportOutcome = 'success'
    await exportButton(wrapper).trigger('click')
    await flushPromises()
    expect(saveFile).toHaveBeenCalledOnce()
  })
})
