import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DATASET_EXPORT_FILENAME, DATASET_LAST_UPDATE, stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { saveFile } from '@/utils/download'
import { formatTimestamp } from '@/utils/format'
import { useAdminStore } from '../admin'
import { useDirectoryStore } from '../directory'
import { useUiStore } from '../ui'

// jsdom cannot download a file; what the store hands to the browser is checked instead.
vi.mock('@/utils/download', () => ({ saveFile: vi.fn() }))

const SUCCESS = 'Database updated successfully with the latest Singapore school data'
const csv = (name = 'moe.csv') => new File(['a,b'], name, { type: 'text/csv' })

describe('admin store (UC-5.1)', () => {
  let api: FakeApi

  beforeEach(async () => {
    setActivePinia(createPinia())
    api = stubApi()
    await signInAs('admin')
  })

  it('starts idle with no figures until the server has said', () => {
    const a = useAdminStore()
    expect(a.busy).toBe(false)
    expect(a.message).toBe('')
    expect(a.error).toBe('')
    expect(a.files).toEqual([])
    expect(a.recordCount).toBeNull()
    expect(a.lastUpdate).toBe('')
  })

  describe('load', () => {
    it('reads the record count and the time of the last update', async () => {
      const a = useAdminStore()
      await a.load()
      expect(a.recordCount).toBe(2418)
      expect(a.lastUpdate).toBe(formatTimestamp(DATASET_LAST_UPDATE))
    })

    it('shows no time when the data was never loaded through an update', async () => {
      api.datasetLastUpdate = null
      const a = useAdminStore()
      await a.load()
      expect(a.recordCount).toBe(2418)
      expect(a.lastUpdate).toBe('')
    })

    it('keeps the old figures when the server cannot be reached', async () => {
      const a = useAdminStore()
      await a.load()
      api.override('GET /admin/dataset', () => {
        throw new TypeError('Failed to fetch')
      })
      await a.load()
      expect(a.recordCount).toBe(2418)
    })
  })

  describe('runUpdate', () => {
    it('sends the picked files to the pipeline', async () => {
      const a = useAdminStore()
      a.setFiles([csv('moe.csv'), csv('ccas.csv')])
      await a.runUpdate()
      const form = api.callsTo('POST /admin/dataset/update')[0]!.body as FormData
      expect(form.getAll('files').map((f) => (f as File).name)).toEqual(['moe.csv', 'ccas.csv'])
    })

    it('locks the trigger while the pipeline runs and ignores a second click (REQ-5.2)', async () => {
      const release = api.hold('POST /admin/dataset/update')
      const a = useAdminStore()
      a.setFiles([csv()])
      const first = a.runUpdate()
      expect(a.busy).toBe(true)
      await a.runUpdate()
      release()
      await first
      expect(api.callsTo('POST /admin/dataset/update')).toHaveLength(1)
      expect(a.busy).toBe(false)
    })

    it('shows the success banner and refreshes the counters on commit (REQ-5.6)', async () => {
      const a = useAdminStore()
      await a.load()
      a.setFiles([csv()])
      await a.runUpdate()
      expect(a.message).toBe(SUCCESS)
      expect(a.recordCount).toBe(2424)
      expect(a.lastUpdate).not.toBe(formatTimestamp(DATASET_LAST_UPDATE))
      expect(a.files).toEqual([])
    })

    it('makes the directory fetch the schools again', async () => {
      const directory = useDirectoryStore()
      await directory.load()
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      expect(directory.status).toBe('loading')
    })

    it('clears the previous banner when a new run starts', async () => {
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      const release = api.hold('POST /admin/dataset/update')
      a.setFiles([csv()])
      const next = a.runUpdate()
      expect(a.message).toBe('')
      release()
      await next
    })

    it('asks for a file instead of running without one, and says so beside the form', async () => {
      const a = useAdminStore()
      await a.runUpdate()
      expect(a.error).toBe('Please select a CSV file before updating the database.')
      expect(useUiStore().modal).toBeNull()
      expect(a.message).toBe('')
    })

    it('clears that message once files are picked', async () => {
      const a = useAdminStore()
      await a.runUpdate()
      a.setFiles([csv()])
      expect(a.error).toBe('')
    })

    it('an unreachable server raises the "Unable to reach API" popup and leaves the records alone (REQ-5.10)', async () => {
      api.override('POST /admin/dataset/update', () => {
        throw new TypeError('Failed to fetch')
      })
      const a = useAdminStore()
      await a.load()
      a.setFiles([csv()])
      await a.runUpdate()
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('timeout')
      expect(ui.modalDefinition?.title).toBe('Database Update Failed')
      expect(ui.modalDefinition?.body).toBe('Unable to reach API. Please try again.')
      expect(a.busy).toBe(false)
      expect(a.message).toBe('')
      expect(a.recordCount).toBe(2418)
    })

    it('a dataset that cannot be processed raises the matching popup (REQ-5.9)', async () => {
      api.datasetOutcome = 'parse'
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('parse')
      expect(ui.modalDefinition?.body).toBe(
        'Unable to process dataset format. Please check source data and try again.',
      )
      expect(a.message).toBe('')
      expect(a.error).toBe('')
    })

    it('an unreachable database raises a popup with the server’s own wording (REQ-5.10)', async () => {
      api.datasetOutcome = 'database'
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      const ui = useUiStore()
      expect(ui.modalDefinition?.title).toBe('Database Update Failed')
      expect(ui.modalDefinition?.body).toBe(
        'Unable to connect to local database. Please try again later.',
      )
    })

    it('says beside the form when another update is already running', async () => {
      api.datasetOutcome = 'running'
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      expect(a.error).toBe('A database update is already running. Please wait for it to finish.')
    })

    it('can run again after a failure', async () => {
      api.datasetOutcome = 'parse'
      const a = useAdminStore()
      a.setFiles([csv()])
      await a.runUpdate()
      api.datasetOutcome = 'success'
      await a.runUpdate()
      expect(a.message).toBe(SUCCESS)
    })
  })

  describe('runExport (UC-5.2)', () => {
    beforeEach(() => vi.mocked(saveFile).mockClear())

    it('asks the server for the export and saves the file under the name it gave', async () => {
      const a = useAdminStore()
      await a.runExport()
      expect(api.callsTo('GET /admin/dataset/export')).toHaveLength(1)
      expect(saveFile).toHaveBeenCalledOnce()
      const [blob, filename] = vi.mocked(saveFile).mock.calls[0]!
      expect(filename).toBe(DATASET_EXPORT_FILENAME)
      expect(await blob.text()).toMatch(/^school_key,school_name\r\n/)
      expect(useUiStore().modal).toBeNull()
      expect(a.exporting).toBe(false)
    })

    it('locks the trigger while the file is fetched and ignores a second click', async () => {
      const release = api.hold('GET /admin/dataset/export')
      const a = useAdminStore()
      const first = a.runExport()
      expect(a.exporting).toBe(true)
      await a.runExport()
      release()
      await first
      expect(api.callsTo('GET /admin/dataset/export')).toHaveLength(1)
      expect(saveFile).toHaveBeenCalledOnce()
      expect(a.exporting).toBe(false)
    })

    it('leaves the update controls and their messages alone', async () => {
      const release = api.hold('GET /admin/dataset/export')
      const a = useAdminStore()
      a.setFiles([csv()])
      const exported = a.runExport()
      expect(a.busy).toBe(false)
      release()
      await exported
      expect(a.files).toHaveLength(1)
      expect(a.message).toBe('')
      expect(a.error).toBe('')
    })

    it('an empty or unreachable database raises the "Export Failed" popup and saves nothing (REQ-5.15)', async () => {
      api.exportOutcome = 'unavailable'
      const a = useAdminStore()
      await a.runExport()
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('export')
      expect(ui.modalDefinition?.title).toBe('Export Failed')
      expect(ui.modalDefinition?.body).toBe('Unable to retrieve school data at this time.')
      expect(saveFile).not.toHaveBeenCalled()
      expect(a.exporting).toBe(false)
    })

    it('an unreachable server raises the same popup', async () => {
      api.override('GET /admin/dataset/export', () => {
        throw new TypeError('Failed to fetch')
      })
      await useAdminStore().runExport()
      expect(useUiStore().modal?.id).toBe('export')
      expect(saveFile).not.toHaveBeenCalled()
    })

    it('can export again after a failure', async () => {
      api.exportOutcome = 'unavailable'
      const a = useAdminStore()
      await a.runExport()
      useUiStore().closeModal()
      api.exportOutcome = 'success'
      await a.runExport()
      expect(saveFile).toHaveBeenCalledOnce()
      expect(useUiStore().modal).toBeNull()
    })
  })

  it('reset clears the banner, the files and the figures', async () => {
    const a = useAdminStore()
    a.setFiles([csv()])
    await a.runUpdate()
    a.reset()
    expect(a.message).toBe('')
    expect(a.files).toEqual([])
    expect(a.recordCount).toBeNull()
    expect(a.lastUpdate).toBe('')
  })

  it('reset also stops showing an export in progress', async () => {
    const release = api.hold('GET /admin/dataset/export')
    const a = useAdminStore()
    const pending = a.runExport()
    expect(a.exporting).toBe(true)
    a.reset()
    expect(a.exporting).toBe(false)
    release()
    await pending
  })
})
