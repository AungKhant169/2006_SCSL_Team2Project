import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authorizedRequest } from '../authorizedRequest'
import { apiRequest } from '../http'
import { deleteReview, editReview, listReviews, submitReview } from '../reviewService'

vi.mock('../authorizedRequest', () => ({ authorizedRequest: vi.fn() }))
vi.mock('../http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../http')>()),
  apiRequest: vi.fn(),
}))
const authorized = vi.mocked(authorizedRequest)
const open = vi.mocked(apiRequest)

const payload = {
  id: 5,
  school_id: 2,
  username: 'kaiyi88',
  text: 'Great',
  created_at: '2026-09-02T07:40:00+00:00',
  updated_at: null,
}

describe('reviewService (matches the /review API contract)', () => {
  beforeEach(() => {
    authorized.mockReset()
    open.mockReset()
  })

  it('lists a school’s reviews without needing a login', async () => {
    open.mockResolvedValue([
      payload,
      { ...payload, id: 6, updated_at: '2026-09-03T08:00:00+00:00' },
    ])
    const reviews = await listReviews(2)
    expect(open).toHaveBeenCalledWith('/review/school/2')
    expect(reviews[0]).toEqual({
      id: 5,
      schoolId: 2,
      username: 'kaiyi88',
      createdAt: '2026-09-02T07:40:00+00:00',
      updatedAt: undefined,
      text: 'Great',
    })
    expect(reviews[1]?.updatedAt).toBe('2026-09-03T08:00:00+00:00')
  })

  it('submits a review for the school', async () => {
    authorized.mockResolvedValue(payload)
    await expect(submitReview(2, 'Great')).resolves.toMatchObject({ id: 5, schoolId: 2 })
    expect(authorized).toHaveBeenCalledWith('/review/school/2', {
      method: 'POST',
      body: { text: 'Great' },
    })
  })

  it('edits a review with PATCH', async () => {
    authorized.mockResolvedValue({ ...payload, text: 'Better' })
    await expect(editReview(5, 'Better')).resolves.toMatchObject({ text: 'Better' })
    expect(authorized).toHaveBeenCalledWith('/review/5', {
      method: 'PATCH',
      body: { text: 'Better' },
    })
  })

  it('deletes a review', async () => {
    authorized.mockResolvedValue(undefined)
    await deleteReview(5)
    expect(authorized).toHaveBeenCalledWith('/review/5', { method: 'DELETE' })
  })
})
