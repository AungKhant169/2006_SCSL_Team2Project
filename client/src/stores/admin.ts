import { ref } from 'vue'
import { defineStore } from 'pinia'
import { DatasetUpdateError, updateDataset } from '@/services/datasetService'
import { formatTimestamp } from '@/utils/format'
import { useUiStore } from './ui'

export const DATASET_SUCCESS_MESSAGE =
  'Database updated successfully with the latest Singapore school data'

const INITIAL_LAST_UPDATE = '11 Sep 2026, 2:05 am'
const INITIAL_RECORD_COUNT = 2418
/** Records added by each simulated pipeline run. */
const RECORDS_PER_UPDATE = 6

/** Manual school dataset update for administrators (UC-5.1). */
export const useAdminStore = defineStore('admin', () => {
  const ui = useUiStore()

  const busy = ref(false)
  const message = ref('')
  const lastUpdate = ref(INITIAL_LAST_UPDATE)
  const recordCount = ref(INITIAL_RECORD_COUNT)

  /**
   * Runs the pipeline. The trigger is locked while it runs (REQ-5.2); a failure leaves the
   * records untouched and raises the matching popup instead of the success banner.
   */
  async function runUpdate() {
    if (busy.value) return
    busy.value = true
    message.value = ''
    try {
      await updateDataset()
      recordCount.value += RECORDS_PER_UPDATE
      lastUpdate.value = formatTimestamp(new Date())
      message.value = DATASET_SUCCESS_MESSAGE
    } catch (error) {
      ui.openModal(error instanceof DatasetUpdateError ? error.kind : 'timeout')
    } finally {
      busy.value = false
    }
  }

  function reset() {
    busy.value = false
    message.value = ''
  }

  return { busy, message, lastUpdate, recordCount, runUpdate, reset }
})
