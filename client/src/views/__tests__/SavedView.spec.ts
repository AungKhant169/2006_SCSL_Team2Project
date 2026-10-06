import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useDirectoryStore } from '@/stores/directory'
import { mountWithApp } from '@/test/helpers'
import SavedView from '../SavedView.vue'

const mountSaved = () => mountWithApp(SavedView, { route: '/saved', signedInAs: 'planner2026' })
const cards = (w: VueWrapper) => w.findAll('article')
const cardName = (card: ReturnType<typeof cards>[number]) => card.get('a').text()

describe('SavedView (UC-2.7, REQ-2.11 to REQ-2.14)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows a quick-view card for each bookmarked school', async () => {
    const { wrapper } = await mountSaved()
    expect(wrapper.get('h1').text()).toBe('Saved institutions')
    expect(cards(wrapper).map(cardName)).toEqual(['Rosyth School', 'Singapore Polytechnic'])
  })

  it('cards carry logo, governance, tier, distance and the tier’s entry benchmark', async () => {
    const { wrapper } = await mountSaved()
    const rosyth = cards(wrapper)[0]!
    expect(rosyth.get('img').attributes('alt')).toBe('Rosyth School badge')
    expect(rosyth.text()).toContain('Government · Primary')
    expect(rosyth.text()).toContain('Distance')
    expect(rosyth.text()).toContain('1.4 km')
    expect(rosyth.text()).toContain('P1 Phase 2C ratio')
    expect(rosyth.text()).toContain('2.4 : 1')

    const poly = cards(wrapper)[1]!
    expect(poly.text()).toContain('Government · Post-Secondary')
    expect(poly.text()).toContain('11.5 km')
    expect(poly.text()).toContain('JAE cut-off')
    expect(poly.text()).toContain('ELR2B2 ≤ 8')
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
    expect(router.currentRoute.value.fullPath).toBe('/schools/2')
  })

  it('removes a school with a single click, updating the list immediately (REQ-2.14)', async () => {
    const { wrapper } = await mountSaved()
    await wrapper.get('button[aria-label="Remove Rosyth School"]').trigger('click')
    expect(cards(wrapper).map(cardName)).toEqual(['Singapore Polytechnic'])
    expect(useBookmarksStore().has(2)).toBe(false)
  })

  it('shows the empty state with a way back to the directory once everything is removed', async () => {
    const { wrapper, router } = await mountSaved()
    for (const id of [2, 9]) useBookmarksStore().remove(id)
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
    useBookmarksStore().add(14)
    await flushPromises()
    expect(cards(wrapper).map(cardName)).toContain('National University of Singapore')
  })
})
