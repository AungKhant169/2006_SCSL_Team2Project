import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookmarksStore } from '../bookmarks'

describe('bookmarks store (UC-2.5 to UC-2.7)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with the demo bookmarks', () => {
    const b = useBookmarksStore()
    expect(b.ids).toEqual([2, 9])
    expect(b.count).toBe(2)
    expect(b.schools.map((s) => s.acronym)).toEqual(['RS', 'SP'])
  })

  it('toggle adds then removes a school', () => {
    const b = useBookmarksStore()
    b.toggle(14)
    expect(b.has(14)).toBe(true)
    expect(b.count).toBe(3)
    b.toggle(14)
    expect(b.has(14)).toBe(false)
    expect(b.count).toBe(2)
  })

  it('does not add the same school twice', () => {
    const b = useBookmarksStore()
    b.add(2)
    expect(b.ids.filter((id) => id === 2)).toHaveLength(1)
  })

  it('remove deletes a school from the saved list in one step (REQ-2.14)', () => {
    const b = useBookmarksStore()
    b.remove(2)
    expect(b.schools.map((s) => s.acronym)).toEqual(['SP'])
    b.remove(9)
    expect(b.schools).toEqual([])
  })

  it('reset restores the demo bookmarks', () => {
    const b = useBookmarksStore()
    b.remove(2)
    b.add(1)
    b.reset()
    expect(b.ids).toEqual([2, 9])
  })
})
