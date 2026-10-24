import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import ToastHost from '../ToastHost.vue'

describe('ToastHost', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows no toast until one is raised', () => {
    const wrapper = mount(ToastHost)
    expect(wrapper.text()).toBe('')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('announces the current toast politely', async () => {
    const wrapper = mount(ToastHost)
    useUiStore().showToast('Profile saved successfully')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('Profile saved successfully')
  })

  it('can be dismissed', async () => {
    const ui = useUiStore()
    ui.showToast('Profile saved successfully')
    const wrapper = mount(ToastHost)
    await wrapper.get('button[aria-label="Dismiss notification"]').trigger('click')
    expect(ui.toast).toBe('')
    expect(wrapper.text()).toBe('')
  })
})
