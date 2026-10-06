import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import NoticeBanner from '../NoticeBanner.vue'

describe('NoticeBanner', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const mountBanner = () => mount(NoticeBanner, { global: { plugins: [] } })

  it('renders nothing when there is no notice', () => {
    expect(mountBanner().find('[role="status"]').exists()).toBe(false)
  })

  it('shows the current notice', async () => {
    const wrapper = mountBanner()
    useUiStore().setNotice('Roadmap saved to your profile.')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('Roadmap saved to your profile.')
  })

  it('can be dismissed', async () => {
    const ui = useUiStore()
    ui.setNotice('Saved roadmap deleted.')
    const wrapper = mountBanner()
    await wrapper.get('button').trigger('click')
    expect(ui.notice).toBe('')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
