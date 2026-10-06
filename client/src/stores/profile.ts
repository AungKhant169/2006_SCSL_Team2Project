import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getLevel } from '@/data/education'
import type { PrimaryResult } from '@/types/profile'
import type { TierId } from '@/types/school'
import { isValidPostalCode, sanitizePostalInput } from '@/utils/postalCode'
import { validateProfile } from '@/utils/profileValidation'
import { DEFAULT_POSTAL, useDirectoryStore } from './directory'

/** Demo profile the design starts with until the backend stores one per account. */
const DEFAULTS = {
  level: 'secondary' as TierId,
  primaryResult: 'None' as PrimaryResult,
  scoreA: '8',
  scoreB: '',
  postal: DEFAULT_POSTAL,
}

/** Academic parameters and residential postal code of the signed-in student (UC-2.4). */
export const useProfileStore = defineStore('profile', () => {
  const level = ref<TierId>(DEFAULTS.level)
  const primaryResult = ref<PrimaryResult>(DEFAULTS.primaryResult)
  const scoreA = ref(DEFAULTS.scoreA)
  const scoreB = ref(DEFAULTS.scoreB)
  const postal = ref(DEFAULTS.postal)
  const error = ref('')
  const status = ref('')

  const postalValid = computed(() => isValidPostalCode(postal.value))
  const levelInfo = computed(() => getLevel(level.value))

  // Editing a field invalidates any earlier validation result or "saved" confirmation.
  watch([scoreA, scoreB], () => ((error.value = ''), (status.value = '')), { flush: 'sync' })
  watch(postal, () => (status.value = ''), { flush: 'sync' })

  /** Picking a different target level clears the academic fields that no longer apply. */
  function setLevel(id: TierId) {
    level.value = id
    scoreA.value = ''
    scoreB.value = ''
    error.value = ''
    status.value = ''
  }

  function setPostal(value: string) {
    postal.value = sanitizePostalInput(value)
  }

  /** Validates and stores the profile; the postal code becomes the directory's reference point. */
  function save(): boolean {
    const message = validateProfile({
      level: level.value,
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      postal: postal.value,
    })
    if (message) {
      error.value = message
      status.value = ''
      return false
    }
    error.value = ''
    status.value = 'Profile saved'
    useDirectoryStore().setPostal(postal.value)
    return true
  }

  function reset() {
    level.value = DEFAULTS.level
    primaryResult.value = DEFAULTS.primaryResult
    scoreA.value = DEFAULTS.scoreA
    scoreB.value = DEFAULTS.scoreB
    postal.value = DEFAULTS.postal
    error.value = ''
    status.value = ''
  }

  return {
    level,
    primaryResult,
    scoreA,
    scoreB,
    postal,
    error,
    status,
    postalValid,
    levelInfo,
    setLevel,
    setPostal,
    save,
    reset,
  }
})
