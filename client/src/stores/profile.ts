import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getLevel } from '@/data/education'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import * as profileService from '@/services/profileService'
import type { ProfileForm } from '@/services/profileService'
import type { PrimaryResult } from '@/types/profile'
import type { TierId } from '@/types/school'
import { isValidPostalCode, sanitizePostalInput } from '@/utils/postalCode'
import { validateProfile } from '@/utils/profileValidation'
import { useDirectoryStore } from './directory'

const DEFAULT_LEVEL: TierId = 'secondary'

/** Student profile controller (UC-2.4): validates form state, stores it, and updates the distance anchor. */
export const useProfileStore = defineStore('profile', () => {
  const level = ref<TierId>(DEFAULT_LEVEL)
  const scoreA = ref('')
  const scoreB = ref('')
  const postal = ref('')
  const primaryResult = ref<PrimaryResult>('None')
  const error = ref('')
  const saving = ref(false)

  const levelInfo = computed(() => getLevel(level.value))
  const postalValid = computed(() => isValidPostalCode(postal.value))

  function clearMessages() {
    error.value = ''
  }

  watch([scoreA, scoreB], clearMessages, { flush: 'sync' })

  /** Scores typed or loaded for each level, kept so that coming back to a level finds them again. */
  const scoresByLevel = new Map<TierId, { scoreA: string; scoreB: string }>()

  /**
   * Each transition shows only its own academic results, since a PSLE score means nothing as an
   * O-Level one. The results of the level being left are set aside rather than thrown away.
   */
  function setLevel(next: TierId) {
    if (next === level.value) return
    scoresByLevel.set(level.value, { scoreA: scoreA.value, scoreB: scoreB.value })
    const kept = scoresByLevel.get(next)
    level.value = next
    scoreA.value = kept?.scoreA ?? ''
    scoreB.value = kept?.scoreB ?? ''
    clearMessages()
  }

  function setPostal(value: string) {
    postal.value = sanitizePostalInput(value)
  }

  function apply(form: ProfileForm) {
    scoresByLevel.clear()
    level.value = form.level
    scoreA.value = form.scoreA
    scoreB.value = form.scoreB
    postal.value = form.postal
    primaryResult.value = form.primaryResult
  }

  /** Fills the form from the account's stored profile. Keeps the starting values if it cannot be read. */
  async function load() {
    try {
      apply(await profileService.loadProfile())
      clearMessages()
    } catch (failure) {
      error.value = failure instanceof ApiError ? failure.message : GENERIC_ERROR
    }
  }

  /** Only a valid form may be stored, and change the directory's residential postal code. */
  async function save(): Promise<boolean> {
    clearMessages()
    error.value = validateProfile({
      level: level.value,
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      postal: postal.value,
    })
    if (error.value) return false

    saving.value = true
    try {
      await profileService.saveProfile({
        level: level.value,
        scoreA: scoreA.value,
        scoreB: scoreB.value,
        postal: postal.value,
        primaryResult: primaryResult.value,
      })
    } catch (failure) {
      error.value = failure instanceof ApiError ? failure.message : GENERIC_ERROR
      return false
    } finally {
      saving.value = false
    }
    useDirectoryStore().setPostal(postal.value)
    return true
  }

  /** Back to the starting values when the account session ends. */
  function reset() {
    scoresByLevel.clear()
    level.value = DEFAULT_LEVEL
    scoreA.value = ''
    scoreB.value = ''
    postal.value = ''
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
    saving,
    levelInfo,
    postalValid,
    setLevel,
    setPostal,
    load,
    save,
    reset,
  }
})
