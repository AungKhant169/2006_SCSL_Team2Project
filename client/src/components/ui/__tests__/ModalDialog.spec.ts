import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ModalDialog from '../ModalDialog.vue'

let wrapper: VueWrapper | undefined

function open(props: { open: boolean }) {
  wrapper = mount(ModalDialog, {
    props: { title: 'Delete your review?', ...props },
    slots: { default: 'This cannot be undone.', actions: '<button>Delete</button>' },
    attachTo: document.body,
  })
  return wrapper
}

const dialog = () => document.body.querySelector('[role="dialog"]')

describe('ModalDialog', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('renders nothing while closed', () => {
    open({ open: false })
    expect(dialog()).toBeNull()
  })

  it('renders an accessible modal dialog outside the page flow when open', () => {
    open({ open: true })
    const el = dialog()!
    expect(el.getAttribute('aria-modal')).toBe('true')
    const heading = el.querySelector('h3')!
    expect(heading.textContent).toBe('Delete your review?')
    expect(el.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(el.textContent).toContain('This cannot be undone.')
    expect(el.querySelector('button')?.textContent).toBe('Delete')
  })

  it('moves focus into the dialog when it opens', async () => {
    const w = open({ open: false })
    await w.setProps({ open: true })
    await w.vm.$nextTick()
    expect(document.activeElement).toBe(dialog())
  })

  it('asks to close on Escape', async () => {
    const w = open({ open: true })
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('asks to close when the backdrop is clicked, but not when the dialog itself is', () => {
    const w = open({ open: true })
    dialog()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(w.emitted('close')).toBeUndefined()
    document.body.querySelector<HTMLElement>('[data-testid="modal-backdrop"]')!.click()
    expect(w.emitted('close')).toHaveLength(1)
  })
})
