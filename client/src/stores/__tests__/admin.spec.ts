import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DATASET_LAST_UPDATE, stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { formatTimestamp } from '@/utils/format'
import { useAdminStore } from '../admin'
import { useDirectoryStore } from '../directory'
import { useUiStore } from '../ui'

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
})
