import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '../ui'

describe('ui store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe('notice', () => {
    it('is dismissed by the next navigation', () => {
      const ui = useUiStore()
      ui.setNotice('Roadmap saved to your profile.')
      expect(ui.notice).toBe('Roadmap saved to your profile.')
      ui.onNavigate()
      expect(ui.notice).toBe('')
    })

    it('can be cleared manually', () => {
      const ui = useUiStore()
      ui.setNotice('hello')
      ui.clearNotice()
      expect(ui.notice).toBe('')
    })

    it('a flashed notice survives exactly one navigation (redirect to login)', () => {
      const ui = useUiStore()
      ui.flashNotice('Log in to view your saved institutions.')
      ui.onNavigate()
      expect(ui.notice).toBe('Log in to view your saved institutions.')
      ui.onNavigate()
      expect(ui.notice).toBe('')
    })

    it('replacing a flashed notice with a plain one restores normal dismissal', () => {
      const ui = useUiStore()
      ui.flashNotice('flash')
      ui.setNotice('plain')
      ui.onNavigate()
      expect(ui.notice).toBe('')
    })
  })

  describe('modal', () => {
    it('opens with the definition for its id', () => {
      const ui = useUiStore()
      expect(ui.modalDefinition).toBeNull()
      ui.openModal('delReview')
      expect(ui.modalDefinition?.title).toBe('Delete your review?')
      expect(ui.modalDefinition?.tone).toBe('danger')
    })

    it('confirming closes the dialog and runs the callback', () => {
      const ui = useUiStore()
      const onConfirm = vi.fn()
      ui.openModal('overwrite', onConfirm)
      ui.confirmModal()
      expect(onConfirm).toHaveBeenCalledOnce()
      expect(ui.modal).toBeNull()
    })

    it('closing without confirming never runs the callback', () => {
      const ui = useUiStore()
      const onConfirm = vi.fn()
      ui.openModal('delRoadmap', onConfirm)
      ui.closeModal()
      expect(onConfirm).not.toHaveBeenCalled()
      expect(ui.modal).toBeNull()
    })

    it('confirming a dialog opened without a callback just closes it', () => {
      const ui = useUiStore()
      ui.openModal('timeout')
      expect(() => ui.confirmModal()).not.toThrow()
      expect(ui.modal).toBeNull()
    })
  })
})
