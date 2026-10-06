import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MODALS } from '@/data/modals'
import type { ModalDefinition, ModalId } from '@/data/modals'

interface OpenModal {
  id: ModalId
  onConfirm?: () => void
}

/** Cross-cutting UI state: the banner notice under the header and the confirmation dialog. */
export const useUiStore = defineStore('ui', () => {
  const notice = ref('')
  const modal = ref<OpenModal | null>(null)
  let keepNoticeOnce = false

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

  function openModal(id: ModalId, onConfirm?: () => void) {
    modal.value = { id, onConfirm }
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
    modal.value ? MODALS[modal.value.id] : null,
  )

  return {
    notice,
    modal,
    modalDefinition,
    setNotice,
    flashNotice,
    clearNotice,
    onNavigate,
    openModal,
    closeModal,
    confirmModal,
  }
})
