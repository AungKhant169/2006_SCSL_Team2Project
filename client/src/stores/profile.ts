import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getLevel } from '@/data/education'
import type { PrimaryResult } from '@/types/profile'
import type { TierId } from '@/types/school'
import { isValidPostalCode, sanitizePostalInput } from '@/utils/postalCode'
import { validateProfile } from '@/utils/profileValidation'
import { DEFAULT_POSTAL, useDirectoryStore } from './directory'

/** Student profile controller (UC-2.4): validates form state and updates the distance anchor. */
export const useProfileStore = defineStore('profile', () => {
  const level = ref<TierId>('secondary')
  const scoreA = ref('8')
  const scoreB = ref('')
  const postal = ref(DEFAULT_POSTAL)
  const primaryResult = ref<PrimaryResult>('None')
  const error = ref('')
  const status = ref('')

  const levelInfo = computed(() => getLevel(level.value))
  const postalValid = computed(() => isValidPostalCode(postal.value))

  function clearMessages() {
    error.value = ''
    status.value = ''
  }

  watch([scoreA, scoreB], clearMessages, { flush: 'sync' })
  watch(postal, () => (status.value = ''), { flush: 'sync' })

  /** Changing the transition clears academic results that belong to the previous one. */
  function setLevel(next: TierId) {
    level.value = next
    scoreA.value = ''
    scoreB.value = ''
    clearMessages()
  }

  function setPostal(value: string) {
    postal.value = sanitizePostalInput(value)
  }

  /** Only a valid form may change the directory's residential postal code. */
  function save(): boolean {
    clearMessages()
    error.value = validateProfile({
      level: level.value,
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      postal: postal.value,
    })
    if (error.value) return false
    useDirectoryStore().setPostal(postal.value)
    status.value = 'Profile saved'
    return true
  }

  /** Restores the demo defaults when the account session ends. */
  function reset() {
    level.value = 'secondary'
    scoreA.value = '8'
    scoreB.value = ''
    postal.value = DEFAULT_POSTAL
    primaryResult.value = 'None'
    clearMessages()
  }

  return {
    level,
    scoreA,
    scoreB,
    postal,
    primaryResult,
    error,
    status,
    levelInfo,
    postalValid,
    setLevel,
    setPostal,
    save,
    reset,
  }
})
