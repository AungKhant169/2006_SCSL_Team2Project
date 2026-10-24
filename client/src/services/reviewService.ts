import type { Review } from '@/types/review'
import { authorizedRequest } from './authorizedRequest'
import { apiRequest } from './http'

interface ReviewPayload {
  id: number
  school_id: number
  username: string
  text: string
  created_at: string
  updated_at: string | null
}

function toReview(payload: ReviewPayload): Review {
  return {
    id: payload.id,
    schoolId: payload.school_id,
    username: payload.username,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at ?? undefined,
    text: payload.text,
  }
}

/** A school's reviews, newest first. Anyone may read them. */
export async function listReviews(schoolId: number): Promise<Review[]> {
  return (await apiRequest<ReviewPayload[]>(`/review/school/${schoolId}`)).map(toReview)
}

export async function submitReview(schoolId: number, text: string): Promise<Review> {
  return toReview(
    await authorizedRequest<ReviewPayload>(`/review/school/${schoolId}`, {
      method: 'POST',
      body: { text },
    }),
  )
}

export async function editReview(reviewId: number, text: string): Promise<Review> {
  return toReview(
    await authorizedRequest<ReviewPayload>(`/review/${reviewId}`, {
      method: 'PATCH',
      body: { text },
    }),
  )
}

export function deleteReview(reviewId: number): Promise<void> {
  return authorizedRequest<void>(`/review/${reviewId}`, { method: 'DELETE' })
}
