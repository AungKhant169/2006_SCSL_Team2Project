import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { useBookmarksStore } from '../bookmarks'
import { useUiStore } from '../ui'

describe('bookmarks store (UC-2.5 to UC-2.7)', () => {
  let api: FakeApi

  beforeEach(() => {
    setActivePinia(createPinia())
    api = stubApi()
  })

  it('starts empty', () => {
    const b = useBookmarksStore()
    expect(b.ids).toEqual([])
    expect(b.count).toBe(0)
    expect(b.schools).toEqual([])
  })

  it('loads the account’s bookmarks in the order saved when the user logs in', async () => {
    api.bookmark('planner2026', 9, 2)
    const b = useBookmarksStore()
    await signInAs('planner2026')
    expect(b.ids).toEqual([9, 2])
    expect(b.count).toBe(2)
    expect(b.schools.map((s) => s.name)).toEqual(['Temasek Junior College', 'Rosyth School'])
  })

  it('does not show another account’s bookmarks', async () => {
    api.bookmark('someoneelse', 1)
    const b = useBookmarksStore()
    await signInAs('planner2026')
    expect(b.count).toBe(0)
  })

  describe('after signing in', () => {
    beforeEach(async () => {
      api.bookmark('planner2026', 2)
      await signInAs('planner2026')
    })

    it('toggle adds then removes a school on the server', async () => {
      const b = useBookmarksStore()
      await b.toggle(5)
      expect(b.has(5)).toBe(true)
      expect(b.count).toBe(2)
      expect(api.bookmarks['planner2026']).toEqual([2, 5])
      await b.toggle(5)
      expect(b.has(5)).toBe(false)
      expect(b.count).toBe(1)
      expect(api.bookmarks['planner2026']).toEqual([2])
    })

    it('shows the added school’s details straight away', async () => {
      const b = useBookmarksStore()
      await b.add(5)
      expect(b.schools.map((s) => s.name)).toEqual(['Rosyth School', 'Raffles Institution'])
    })

    it('does not ask the server to add a school twice', async () => {
      const b = useBookmarksStore()
      await b.add(2)
      expect(api.callsTo('PUT /bookmark/2')).toHaveLength(0)
    })

    it('remove deletes a school from the saved list in one step (REQ-2.14)', async () => {
      const b = useBookmarksStore()
      await b.remove(2)
      expect(b.schools).toEqual([])
      expect(api.callsTo('GET /bookmark')).toHaveLength(1)
    })

    it('ignores a second click while the first is still being sent', async () => {
      const b = useBookmarksStore()
      const release = api.hold('PUT /bookmark/5')
      const first = b.add(5)
      expect(b.isPending(5)).toBe(true)
      await b.add(5)
      release()
      await first
      expect(api.callsTo('PUT /bookmark/5')).toHaveLength(1)
      expect(b.isPending(5)).toBe(false)
    })

    it('keeps the list and raises a notice when the server refuses', async () => {
      const b = useBookmarksStore()
      api.override('PUT /bookmark/5', () =>
        Response.json({ detail: 'This school could not be found.' }, { status: 404 }),
      )
      await b.add(5)
      expect(b.has(5)).toBe(false)
      expect(useUiStore().notice).toBe('This school could not be found.')
      expect(b.isPending(5)).toBe(false)
    })

    it('reset forgets the bookmarks', () => {
      const b = useBookmarksStore()
      b.reset()
      expect(b.count).toBe(0)
    })
  })
})
