import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import ModalHost from '../ModalHost.vue'

let wrapper: VueWrapper | undefined
const dialog = () => document.body.querySelector('[role="dialog"]')
const buttons = () => Array.from(dialog()!.querySelectorAll('button'))

async function mountHost() {
  wrapper = mount(ModalHost, { attachTo: document.body })
  await wrapper.vm.$nextTick()
}

describe('ModalHost', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('shows no dialog until one is opened', async () => {
    await mountHost()
    expect(dialog()).toBeNull()
  })

  it('renders the opened dialog with its copy and both actions', async () => {
    await mountHost()
    useUiStore().openModal('delRoadmap')
    await wrapper!.vm.$nextTick()
    expect(dialog()!.querySelector('h3')!.textContent).toBe('Delete saved roadmap?')
    expect(dialog()!.textContent).toContain('There is no undo')
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Delete roadmap'])
  })

  it('styles destructive confirmations in the danger colour', async () => {
    await mountHost()
    useUiStore().openModal('delReview')
    await wrapper!.vm.$nextTick()
    expect(buttons()[1]!.classList.contains('btn-danger')).toBe(true)
    useUiStore().openModal('overwrite')
    await wrapper!.vm.$nextTick()
    expect(buttons()[1]!.classList.contains('btn-primary')).toBe(true)
  })

  it('runs the confirm action and closes', async () => {
    await mountHost()
    const ui = useUiStore()
    const onConfirm = vi.fn()
    ui.openModal('overwrite', onConfirm)
    await wrapper!.vm.$nextTick()
    buttons()[1]!.click()
    await wrapper!.vm.$nextTick()
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(dialog()).toBeNull()
  })

  it('cancel closes without running the action', async () => {
    await mountHost()
    const ui = useUiStore()
    const onConfirm = vi.fn()
    ui.openModal('overwrite', onConfirm)
    await wrapper!.vm.$nextTick()
    buttons()[0]!.click()
    await wrapper!.vm.$nextTick()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('informational dialogs only offer Close', async () => {
    await mountHost()
    useUiStore().openModal('timeout')
    await wrapper!.vm.$nextTick()
    expect(dialog()!.querySelector('h3')!.textContent).toBe('Database Update Failed')
    expect(dialog()!.textContent).toContain('Unable to reach API. Please try again.')
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Close'])
  })
})
