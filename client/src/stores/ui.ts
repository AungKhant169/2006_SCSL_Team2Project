import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MODALS } from '@/data/modals'
import type { ModalDefinition, ModalId } from '@/data/modals'

interface OpenModal {
  id: ModalId
  onConfirm?: () => void
  /** Replaces the dialog's standard text, e.g. with a message the server sent. */
  body?: string
}

const TOAST_DURATION_MS = 4000

/** Cross-cutting UI state: the banner notice under the header, the toast and the confirmation dialog. */
export const useUiStore = defineStore('ui', () => {
  const notice = ref('')
  const toast = ref('')
  const modal = ref<OpenModal | null>(null)
  let keepNoticeOnce = false
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  /** Shows a notice on the current page. It is dismissed by the next navigation. */
  function setNotice(message: string) {
    notice.value = message
    keepNoticeOnce = false
  }

  /** Shows a notice that survives the next navigation, e.g. "Log in to ..." after a redirect. */
  function flashNotice(message: string) {
    notice.value = message
    keepNoticeOnce = true
  }

  function clearNotice() {
    notice.value = ''
    keepNoticeOnce = false
  }

  /** Called when a navigation starts: drops the notice unless it was flashed for this hop. */
  function onNavigate() {
    if (keepNoticeOnce) keepNoticeOnce = false
    else notice.value = ''
  }

  /** Shows a short confirmation that disappears by itself. Unlike the notice, it outlives navigation. */
  function showToast(message: string, duration = TOAST_DURATION_MS) {
    clearTimeout(toastTimer)
    toast.value = message
    toastTimer = setTimeout(dismissToast, duration)
  }

  function dismissToast() {
    clearTimeout(toastTimer)
    toast.value = ''
  }

  function openModal(id: ModalId, onConfirm?: () => void, body?: string) {
    modal.value = { id, onConfirm, body }
  }

  function closeModal() {
    modal.value = null
  }

  function confirmModal() {
    const onConfirm = modal.value?.onConfirm
    modal.value = null
    onConfirm?.()
  }

  const modalDefinition = computed<ModalDefinition | null>(() =>
    modal.value
      ? { ...MODALS[modal.value.id], ...(modal.value.body ? { body: modal.value.body } : {}) }
      : null,
  )

  return {
    notice,
    toast,
    modal,
    modalDefinition,
    setNotice,
    flashNotice,
    clearNotice,
    onNavigate,
    showToast,
    dismissToast,
    openModal,
    closeModal,
    confirmModal,
  }
})
