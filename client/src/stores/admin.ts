import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as adminService from '@/services/adminService'
import { ApiError } from '@/services/http'
import { formatTimestamp } from '@/utils/format'
import { useDirectoryStore } from './directory'
import { useUiStore } from './ui'

/** The server starts the message of a failed pipeline run with this; other errors are about the input. */
const FAILURE_PREFIX = 'Database Update Failed:'

/** Manual school dataset update for administrators (UC-5.1). */
export const useAdminStore = defineStore('admin', () => {
  const ui = useUiStore()

  const busy = ref(false)
  /** The success banner. */
  const message = ref('')
  /** Why the files were refused, shown beside the form. */
  const error = ref('')
  /** The CSV files picked for the next run. */
  const files = ref<File[]>([])
  /** Schools in the database, or null until the server has said. */
  const recordCount = ref<number | null>(null)
  /** When the data was last loaded, ready to show; empty if the server has no record of it. */
  const lastUpdate = ref('')

  function setFiles(selected: File[]) {
    files.value = selected
    error.value = ''
  }

  /** Reads the school count and the time of the last update. A failure leaves the old figures. */
  async function load() {
    try {
      const status = await adminService.fetchDatasetStatus()
      recordCount.value = status.records
      lastUpdate.value = status.lastUpdate ? formatTimestamp(status.lastUpdate) : ''
    } catch {
      // The panel still works without its counters.
    }
  }

  /** A failed run: the pipeline's own messages become the popup, a problem with the files stays inline. */
  function fail(failure: unknown) {
    if (!(failure instanceof ApiError) || failure.status === 0) {
      ui.openModal('timeout')
    } else if (failure.message.startsWith(FAILURE_PREFIX)) {
      const body = failure.message.slice(FAILURE_PREFIX.length).trim()
      ui.openModal(failure.status === 422 ? 'parse' : 'timeout', undefined, body)
    } else {
      error.value = failure.message
    }
  }

  /**
   * Sends the picked files to the pipeline. The trigger is locked while it runs (REQ-5.2); a
   * failure leaves the records untouched and raises the matching popup instead of the banner.
   */
  async function runUpdate() {
    if (busy.value) return
    busy.value = true
    message.value = ''
    error.value = ''
    try {
      const summary = await adminService.updateDataset(files.value)
      message.value = summary.message
      files.value = []
      // The schools the directory fetched earlier may have changed.
      useDirectoryStore().clearCatalogue()
      await load()
    } catch (failure) {
      fail(failure)
    } finally {
      busy.value = false
    }
  }

  function reset() {
    busy.value = false
    message.value = ''
    error.value = ''
    files.value = []
    recordCount.value = null
    lastUpdate.value = ''
  }

  return { busy, message, error, files, lastUpdate, recordCount, setFiles, load, runUpdate, reset }
})
