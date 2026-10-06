import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountWithApp } from '@/test/helpers'
import AppHeader from '../AppHeader.vue'

describe('AppHeader', () => {
  it('shows the PathSG brand linking home', async () => {
    const { wrapper } = await mountWithApp(AppHeader, { route: '/login' })
    const brand = wrapper.get('a[aria-label="PathSG home"]')
    expect(brand.text()).toContain('PathSG')
    expect(brand.text()).toContain('Education planning platform')
    expect(brand.attributes('href')).toBe('/')
  })

  it('always renders the main navigation for wide screens', async () => {
    const { wrapper } = await mountWithApp(AppHeader)
    expect(wrapper.findAll('nav')).toHaveLength(1)
    expect(wrapper.get('nav').classes()).toContain('hidden')
    expect(wrapper.get('nav').classes()).toContain('md:flex')
  })

  describe('mobile menu (QUAL-1)', () => {
    it('is collapsed behind a hamburger button until opened', async () => {
      const { wrapper } = await mountWithApp(AppHeader)
      const button = wrapper.get('button[aria-label="Menu"]')
      expect(button.attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('#mobile-menu').exists()).toBe(false)
      expect(button.classes()).toContain('md:hidden')
      expect(button.classes()).toContain('size-11')
    })

    it('opens a menu with the same entries, role-gated like the desktop nav', async () => {
      const { wrapper } = await mountWithApp(AppHeader)
      await wrapper.get('button[aria-label="Menu"]').trigger('click')
      const menu = wrapper.get('#mobile-menu')
      expect(wrapper.get('button[aria-label="Menu"]').attributes('aria-expanded')).toBe('true')
      expect(menu.findAll('a').map((a) => a.text())).toEqual(['Directory', 'Roadmap', 'Log in'])
    })

    it('toggles closed again', async () => {
      const { wrapper } = await mountWithApp(AppHeader)
      const button = wrapper.get('button[aria-label="Menu"]')
      await button.trigger('click')
      await button.trigger('click')
      expect(wrapper.find('#mobile-menu').exists()).toBe(false)
    })

    it('closes after navigating', async () => {
      const { wrapper, router } = await mountWithApp(AppHeader)
      await wrapper.get('button[aria-label="Menu"]').trigger('click')
      await wrapper.get('#mobile-menu a[href="/login"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('login')
      expect(wrapper.find('#mobile-menu').exists()).toBe(false)
    })
  })
})
