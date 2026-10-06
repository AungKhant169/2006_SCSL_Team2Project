import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useBookmarksStore } from '@/stores/bookmarks'
import { mountWithApp, signInAs, stubAuthApi } from '@/test/helpers'
import NavLinks from '../NavLinks.vue'

const labels = (wrapper: Awaited<ReturnType<typeof mountWithApp>>['wrapper']) =>
  wrapper.findAll('a, button').map((el) => el.text().replace(/\s+/g, ' ').trim())

describe('NavLinks', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('guest', () => {
    it('sees Directory, Roadmap and Log in only (REQ-2.17)', async () => {
      const { wrapper } = await mountWithApp(NavLinks)
      expect(labels(wrapper)).toEqual(['Directory', 'Roadmap', 'Log in'])
    })

    it('Log in links to the login page', async () => {
      const { wrapper } = await mountWithApp(NavLinks)
      expect(wrapper.findAll('a').at(-1)!.attributes('href')).toBe('/login')
    })
  })

  describe('signed-in student', () => {
    async function mountSignedIn(username = 'planner2026') {
      stubAuthApi()
      const mounted = await mountWithApp(NavLinks)
      await signInAs(username)
      await flushPromises()
      return mounted
    }

    it('also sees Saved with a count, My profile and their name with Log out', async () => {
      const { wrapper } = await mountSignedIn()
      expect(labels(wrapper)).toEqual([
        'Directory',
        'Roadmap',
        'Saved 2',
        'My profile',
        'planner2026 · Log out',
      ])
    })

    it('does not show the admin panel to a regular account', async () => {
      const { wrapper } = await mountSignedIn()
      expect(wrapper.text()).not.toContain('Admin panel')
    })

    it('keeps the Saved count in step with bookmarks', async () => {
      const { wrapper } = await mountSignedIn()
      useBookmarksStore().add(14)
      await flushPromises()
      expect(wrapper.get('[data-testid="saved-count"]').text()).toBe('3')
    })

    it('logging out returns to the directory and restores the guest menu', async () => {
      const { wrapper, router } = await mountSignedIn()
      await router.push('/profile')
      await wrapper.findAll('button').at(-1)!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('directory')
      expect(labels(wrapper)).toEqual(['Directory', 'Roadmap', 'Log in'])
    })
  })

  describe('admin', () => {
    it('sees the Admin panel entry (REQ-5.7)', async () => {
      stubAuthApi()
      const { wrapper } = await mountWithApp(NavLinks)
      await signInAs('admin')
      await flushPromises()
      expect(labels(wrapper)).toContain('Admin panel')
    })
  })

  it('highlights the entry for the current page only', async () => {
    const { wrapper, router } = await mountWithApp(NavLinks)
    const active = () => wrapper.findAll('.nav-link-active').map((a) => a.text())
    expect(active()).toEqual(['Directory'])
    stubAuthApi()
    await signInAs('planner2026')
    await router.push('/saved')
    await flushPromises()
    expect(active()).toEqual(['Saved 2'])
    await router.push('/schools/2')
    await flushPromises()
    expect(active()).toEqual([])
  })

  it('column layout (mobile menu) uses 44px touch targets', async () => {
    const { wrapper } = await mountWithApp(NavLinks, { props: { orientation: 'column' } })
    const links = wrapper.findAll('a')
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link.classes()).toContain('min-h-11')
    expect(wrapper.classes()).toContain('flex-col')
  })
})
