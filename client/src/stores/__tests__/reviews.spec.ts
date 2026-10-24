import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { useReviewsStore } from '../reviews'

describe('reviews store (UC-4.1 to UC-4.4)', () => {
  let api: FakeApi

  beforeEach(async () => {
    setActivePinia(createPinia())
    api = stubApi()
    api.addReview({ school_id: 2, username: 'eastsideparent', text: 'Strong Chinese programme' })
    api.addReview({
      school_id: 2,
      username: 'kaiyi88',
      text: 'Teachers respond quickly',
      created_at: '2026-09-02T07:40:00+00:00',
    })
    await signInAs('planner2026')
  })

  describe('load', () => {
    it('lists a school’s reviews newest first (REQ-4.3)', async () => {
      const r = useReviewsStore()
      expect(await r.load(2)).toBe('')
      expect(r.forSchool(2).map((x) => x.username)).toEqual(['eastsideparent', 'kaiyi88'])
    })

    it('returns nothing for a school without reviews (REQ-4.11)', async () => {
      const r = useReviewsStore()
      expect(await r.load(1)).toBe('')
      expect(r.forSchool(1)).toEqual([])
    })

    it('has nothing to show before the reviews are loaded', () => {
      expect(useReviewsStore().forSchool(2)).toEqual([])
    })

    it('reports a failure to load', async () => {
      api.override('GET /review/school/2', () => {
        throw new TypeError('Failed to fetch')
      })
      expect(await useReviewsStore().load(2)).toMatch(/Unable to complete your request/)
    })
  })

  describe('submit', () => {
    it('adds a review that becomes the newest for that school', async () => {
      const r = useReviewsStore()
      await r.load(2)
      expect(await r.submit(2, 'planner2026', 'Great school')).toBe('')
      const [newest] = r.forSchool(2)
      expect(newest).toMatchObject({ username: 'planner2026', text: 'Great school' })
      expect(newest?.updatedAt).toBeUndefined()
      expect(api.reviews.some((x) => x.text === 'Great school')).toBe(true)
    })

    it.each(['', '   ', '\n\t', '<b></b>'])('rejects blank text %j (REQ-4.6)', async (text) => {
      const r = useReviewsStore()
      expect(await r.submit(1, 'planner2026', text)).toBe(
        'Review text cannot be blank or consist entirely of spaces.',
      )
      expect(api.callsTo('POST /review/school/1')).toHaveLength(0)
    })

    it('strips HTML tags before sending (REQ-4.4)', async () => {
      const r = useReviewsStore()
      await r.submit(1, 'planner2026', '<script>alert(1)</script>Nice <b>campus</b>')
      expect(api.callsTo('POST /review/school/1')[0]?.body).toEqual({
        text: 'alert(1)Nice campus',
      })
    })

    it('allows only one review per school per account (BR-6)', async () => {
      const r = useReviewsStore()
      expect(await r.submit(1, 'planner2026', 'First')).toBe('')
      expect(await r.submit(1, 'planner2026', 'Second')).toMatch(/already reviewed/)
      expect(r.forSchool(1)).toHaveLength(1)
      expect(api.callsTo('POST /review/school/1')).toHaveLength(1)
    })

    it('shows the server’s refusal when it knows better', async () => {
      const r = useReviewsStore()
      api.addReview({ school_id: 1, username: 'planner2026', text: 'Posted on another device' })
      // Not loaded here, so the store cannot know; the server says no.
      expect(await r.submit(1, 'planner2026', 'Second')).toBe(
        'You have already reviewed this school.',
      )
      expect(r.forSchool(1)).toEqual([])
    })
  })

  describe('ownReview', () => {
    it('finds the account’s own review for a school', async () => {
      const r = useReviewsStore()
      await r.load(2)
      expect(r.ownReview(2, 'kaiyi88')?.text).toBe('Teachers respond quickly')
      expect(r.ownReview(2, 'planner2026')).toBeUndefined()
      expect(r.ownReview(9, 'kaiyi88')).toBeUndefined()
    })
  })

  describe('edit (REQ-4.7)', () => {
    async function ownReview() {
      const r = useReviewsStore()
      await r.submit(1, 'planner2026', 'First thoughts')
      return { r, id: r.ownReview(1, 'planner2026')!.id }
    }

    it('updates the text and marks it as edited', async () => {
      const { r, id } = await ownReview()
      expect(await r.edit(id, '  Updated text ')).toBe('')
      const review = r.ownReview(1, 'planner2026')
      expect(review?.text).toBe('Updated text')
      expect(review?.updatedAt).toBeTruthy()
    })

    it('rejects blank text and keeps the original', async () => {
      const { r, id } = await ownReview()
      expect(await r.edit(id, '   ')).toMatch(/cannot be blank/)
      expect(r.ownReview(1, 'planner2026')?.text).toBe('First thoughts')
    })

    it('only the author may edit (REQ-4.10)', async () => {
      const r = useReviewsStore()
      await r.load(2)
      const theirs = r.ownReview(2, 'kaiyi88')!
      expect(await r.edit(theirs.id, 'hacked')).toBe('You can only change your own review.')
      expect(r.ownReview(2, 'kaiyi88')?.text).toBe('Teachers respond quickly')
    })

    it('keeps the original posting position among reviews', async () => {
      const r = useReviewsStore()
      await r.load(2)
      const mine = r.ownReview(2, 'kaiyi88')!
      await signInAs('kaiyi88')
      await r.edit(mine.id, 'edited')
      expect(r.forSchool(2).map((x) => x.username)).toEqual(['eastsideparent', 'kaiyi88'])
    })
  })

  describe('remove (REQ-4.9)', () => {
    it('lets the author delete their review', async () => {
      const r = useReviewsStore()
      await r.submit(1, 'planner2026', 'Short stay')
      const { id } = r.ownReview(1, 'planner2026')!
      expect(await r.remove(1, id)).toBe('')
      expect(r.forSchool(1)).toEqual([])
      expect(api.reviews.some((x) => x.id === id)).toBe(false)
    })

    it('refuses to delete someone else’s review', async () => {
      const r = useReviewsStore()
      await r.load(2)
      const theirs = r.ownReview(2, 'kaiyi88')!
      expect(await r.remove(2, theirs.id)).toBe('You can only change your own review.')
      expect(r.forSchool(2)).toHaveLength(2)
    })

    it('lets the author post again afterwards', async () => {
      const r = useReviewsStore()
      await r.submit(1, 'planner2026', 'First')
      await r.remove(1, r.ownReview(1, 'planner2026')!.id)
      expect(await r.submit(1, 'planner2026', 'Back again')).toBe('')
    })
  })
})
