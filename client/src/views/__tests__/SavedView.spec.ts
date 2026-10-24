import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useDirectoryStore } from '@/stores/directory'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import SavedView from '../SavedView.vue'

/** The Saved page of a student with Rosyth (primary) and Raffles Institution (secondary) saved. */
async function mountSaved() {
  const api = stubApi()
  api.bookmark('planner2026', 2, 5)
  const mounted = await mountWithApp(SavedView, {
    route: '/saved',
    signedInAs: 'planner2026',
    api,
  })
  await flushPromises()
  return mounted
}
const cards = (w: VueWrapper) => w.findAll('article')
const cardName = (card: ReturnType<typeof cards>[number]) => card.get('a').text()

describe('SavedView (UC-2.7, REQ-2.11 to REQ-2.14)', () => {
  it('shows a quick-view card for each bookmarked school, in the order saved', async () => {
    const { wrapper } = await mountSaved()
    expect(wrapper.get('h1').text()).toBe('Saved institutions')
    expect(cards(wrapper).map(cardName)).toEqual(['Rosyth School', 'Raffles Institution'])
  })

  it('cards carry logo, governance, tier, distance and the tier’s entry benchmark', async () => {
    const { wrapper } = await mountSaved()
    const rosyth = cards(wrapper)[0]!
    expect(rosyth.find('img, span[aria-label="Rosyth School badge"]').exists()).toBe(true)
    expect(rosyth.text()).toContain('Government · Primary')
    expect(rosyth.text()).toContain('Distance')
    expect(rosyth.text()).toMatch(/1\.\d km/)
    expect(rosyth.text()).toContain('Places taken (Phase 2B)')
    expect(rosyth.text()).toContain('95 places')

    const raffles = cards(wrapper)[1]!
    expect(raffles.text()).toContain('Independent · Secondary')
    expect(raffles.text()).toContain('PSLE T-score cut-off')
    expect(raffles.text()).toContain('T-score ≥ 260')
  })

  it('names the postal code distances are measured from', async () => {
    const { wrapper } = await mountSaved()
    expect(wrapper.text()).toContain('Distances from your saved postal code 556000.')
    useDirectoryStore().setPostal('')
    await flushPromises()
    expect(wrapper.text()).toContain('Add a postal code in your profile to see distances.')
    expect(wrapper.text()).toContain('Add postal code')
  })

  it('opens a school from its name', async () => {
    const { wrapper, router } = await mountSaved()
    await cards(wrapper)[0]!.get('a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schools/rosyth')
  })

  it('removes a school with a single click, updating the list immediately (REQ-2.14)', async () => {
    const { wrapper, api } = await mountSaved()
    await wrapper.get('button[aria-label="Remove Rosyth School"]').trigger('click')
    await flushPromises()
    expect(cards(wrapper).map(cardName)).toEqual(['Raffles Institution'])
    expect(useBookmarksStore().has(2)).toBe(false)
    expect(api.bookmarks['planner2026']).toEqual([5])
  })

  it('shows the empty state with a way back to the directory once everything is removed', async () => {
    const { wrapper, router } = await mountSaved()
    for (const id of [2, 5]) await useBookmarksStore().remove(id)
    await flushPromises()
    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.get('h3').text()).toBe('No saved institutions yet')
    expect(wrapper.text()).toContain(
      'Bookmark schools from the directory to compare distance and entry benchmarks here.',
    )
    await wrapper
      .findAll('a')
      .find((a) => a.text() === 'Go to directory')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('has a Browse directory shortcut', async () => {
    const { wrapper, router } = await mountSaved()
    await wrapper
      .findAll('a')
      .find((a) => a.text() === 'Browse directory')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('reflects bookmarks added elsewhere', async () => {
    const { wrapper } = await mountSaved()
    await useBookmarksStore().add(9)
    await flushPromises()
    expect(cards(wrapper).map(cardName)).toContain('Temasek Junior College')
  })
})
