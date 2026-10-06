import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useReviewsStore } from '../reviews'

describe('reviews store (UC-4.1 to UC-4.4)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists a school’s reviews newest first (REQ-4.3)', () => {
    const r = useReviewsStore()
    expect(r.forSchool(2).map((x) => x.username)).toEqual(['eastsideparent', 'kaiyi88'])
  })

  it('returns nothing for a school without reviews (REQ-4.11)', () => {
    expect(useReviewsStore().forSchool(1)).toEqual([])
  })

  describe('submit', () => {
    it('adds a review that becomes the newest for that school', () => {
      const r = useReviewsStore()
      expect(r.submit(2, 'planner2026', 'Great school')).toBe('')
      const [newest] = r.forSchool(2)
      expect(newest).toMatchObject({ username: 'planner2026', text: 'Great school' })
      expect(newest?.updatedAt).toBeUndefined()
    })

    it.each(['', '   ', '\n\t', '<b></b>'])('rejects blank text %j (REQ-4.6)', (text) => {
      const r = useReviewsStore()
      expect(r.submit(1, 'planner2026', text)).toBe(
        'Review text cannot be blank or consist entirely of spaces.',
      )
      expect(r.forSchool(1)).toEqual([])
    })

    it('strips HTML tags before storing (REQ-4.4)', () => {
      const r = useReviewsStore()
      r.submit(1, 'planner2026', '<script>alert(1)</script>Nice <b>campus</b>')
      expect(r.forSchool(1)[0]?.text).toBe('alert(1)Nice campus')
    })

    it('allows only one review per school per account (BR-6)', () => {
      const r = useReviewsStore()
      expect(r.submit(1, 'planner2026', 'First')).toBe('')
      expect(r.submit(1, 'planner2026', 'Second')).toMatch(/already reviewed/)
      expect(r.forSchool(1)).toHaveLength(1)
      expect(r.submit(1, 'someoneelse', 'Mine')).toBe('')
    })

    it('hands out unique ids', () => {
      const r = useReviewsStore()
      r.submit(1, 'a1', 'x')
      r.submit(1, 'b2', 'y')
      const ids = r.reviews.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('ownReview', () => {
    it('finds the account’s own review for a school', () => {
      const r = useReviewsStore()
      expect(r.ownReview(2, 'kaiyi88')?.id).toBe(102)
      expect(r.ownReview(2, 'planner2026')).toBeUndefined()
      expect(r.ownReview(9, 'kaiyi88')).toBeUndefined()
    })
  })

  describe('edit (REQ-4.7)', () => {
    it('updates the text and marks it as edited', () => {
      const r = useReviewsStore()
      expect(r.edit(102, 'kaiyi88', '  Updated <i>text</i> ')).toBe('')
      const review = r.ownReview(2, 'kaiyi88')
      expect(review?.text).toBe('Updated text')
      expect(review?.updatedAt).toBeTruthy()
    })

    it('rejects blank text and keeps the original', () => {
      const r = useReviewsStore()
      const original = r.ownReview(2, 'kaiyi88')?.text
      expect(r.edit(102, 'kaiyi88', '   ')).toMatch(/cannot be blank/)
      expect(r.ownReview(2, 'kaiyi88')?.text).toBe(original)
    })

    it('only the author may edit (REQ-4.10)', () => {
      const r = useReviewsStore()
      expect(r.edit(102, 'intruder', 'hacked')).toMatch(/only edit your own/)
      expect(r.ownReview(2, 'kaiyi88')?.text).not.toBe('hacked')
    })

    it('keeps the original posting position among reviews', () => {
      const r = useReviewsStore()
      r.edit(102, 'kaiyi88', 'edited')
      expect(r.forSchool(2).map((x) => x.id)).toEqual([101, 102])
    })
  })

  describe('remove (REQ-4.9)', () => {
    it('lets the author delete their review', () => {
      const r = useReviewsStore()
      expect(r.remove(102, 'kaiyi88')).toBe(true)
      expect(r.forSchool(2).map((x) => x.id)).toEqual([101])
    })

    it('refuses to delete someone else’s review', () => {
      const r = useReviewsStore()
      expect(r.remove(102, 'intruder')).toBe(false)
      expect(r.forSchool(2)).toHaveLength(2)
    })

    it('lets the author post again afterwards', () => {
      const r = useReviewsStore()
      r.remove(102, 'kaiyi88')
      expect(r.submit(2, 'kaiyi88', 'Back again')).toBe('')
    })
  })
})
