import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import HomeView from '../HomeView.vue'

async function mountHome(options: Parameters<typeof mountWithApp>[1] = {}) {
  const mounted = await mountWithApp(HomeView, { route: '/', ...options })
  await flushPromises()
  return mounted
}

describe('HomeView', () => {
  it('opens with what PathSG is for and the route to start from', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.get('h1').text()).toBe("Plan your path through Singapore's schools")
    expect(wrapper.find('fieldset').exists()).toBe(true)
  })

  it('links each thing PathSG does to the page that does it', async () => {
    const { wrapper } = await mountHome()
    const links = wrapper.findAll('li h3 a').map((a) => [a.text(), a.attributes('href')])
    expect(links).toEqual([
      ['School profiles', '/directory'],
      ['Distance from home', '/directory'],
      ['Roadmaps', '/roadmap'],
      ['Saved schools and reviews', '/saved'],
    ])
  })

  it('tells visitors what personal details are never asked for (SEC-1)', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.text()).toContain('No real names, birth dates or NRIC numbers')
  })

  it('credits where the school data and maps come from', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.text()).toContain('Ministry of Education, via data.gov.sg')
    expect(wrapper.text()).toContain('OneMap')
  })

  describe('as a guest', () => {
    it('invites them to log in or create an account', async () => {
      const { wrapper, router } = await mountHome()
      expect(wrapper.text()).toContain('Keep your plans')
      const join = wrapper.findAll('a').find((a) => a.text() === 'Log in or create an account')!
      await join.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('signed in', () => {
    it('welcomes the student and offers the pages they use', async () => {
      const api = stubApi()
      api.bookmark('planner2026', 2, 9)
      const { wrapper } = await mountHome({ api, signedInAs: 'planner2026' })
      expect(wrapper.text()).toContain('Welcome back, planner2026')
      expect(wrapper.text()).not.toContain('Keep your plans')
      const links = wrapper.findAll('a').map((a) => a.text())
      expect(links).toContain('Open roadmap')
      expect(links).toContain('Saved schools (2)')
      expect(links).toContain('My profile')
    })
  })
})
