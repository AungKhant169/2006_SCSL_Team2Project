import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'
import { FakeApi, stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import BookmarkButton from '../BookmarkButton.vue'

/** Mounts the button for a school; user planner2026 has school 2 bookmarked already. */
function mountFor(schoolId: number, signedInAs?: string) {
  const api: FakeApi = stubApi()
  api.bookmark('planner2026', 2)
  return mountWithApp(BookmarkButton, { props: { schoolId }, signedInAs, api })
}

describe('BookmarkButton (UC-2.5, UC-2.6, BR-2)', () => {
  it('is not shown to guests', async () => {
    const { wrapper } = await mountFor(1)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('offers "Save" for a school that is not bookmarked', async () => {
    const { wrapper } = await mountFor(1, 'planner2026')
    expect(wrapper.text()).toBe('☆ Save')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
  })

  it('shows "Saved" for a bookmarked school', async () => {
    const { wrapper } = await mountFor(2, 'planner2026')
    const button = wrapper.get('button')
    expect(button.text()).toBe('★ Saved')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.classes()).toContain('btn-primary')
  })

  it('adds the bookmark and updates its state on click', async () => {
    const { wrapper, api } = await mountFor(1, 'planner2026')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(useBookmarksStore().has(1)).toBe(true)
    expect(wrapper.text()).toBe('★ Saved')
    expect(api.bookmarks['planner2026']).toEqual([2, 1])
  })

  it('removes the bookmark when clicked again', async () => {
    const { wrapper, api } = await mountFor(2, 'planner2026')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(useBookmarksStore().has(2)).toBe(false)
    expect(wrapper.text()).toBe('☆ Save')
    expect(api.bookmarks['planner2026']).toEqual([])
  })

  it('is disabled while its request is in flight', async () => {
    const { wrapper, api } = await mountFor(1, 'planner2026')
    const release = api.hold('PUT /bookmark/1')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    release()
    await flushPromises()
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('does not trigger the click handler of the card around it', async () => {
    const onCardClick = vi.fn()
    const { wrapper } = await mountFor(1, 'planner2026')
    wrapper.element.parentElement?.addEventListener('click', onCardClick)
    await wrapper.get('button').trigger('click')
    expect(onCardClick).not.toHaveBeenCalled()
  })

  it('disappears again after logging out', async () => {
    const { wrapper } = await mountFor(1, 'planner2026')
    await useAuthStore().logout()
    await flushPromises()
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
