import { ref } from 'vue'
import { defineStore } from 'pinia'
import { SEED_REVIEWS } from '@/data/reviews'
import type { Review } from '@/types/review'
import { BLANK_REVIEW_ERROR, sanitizeReviewText } from '@/utils/reviewText'

/** School reviews (UC-4.1 to UC-4.4). One review per account per school (BR-6). */
export const useReviewsStore = defineStore('reviews', () => {
  const reviews = ref<Review[]>(SEED_REVIEWS.map((r) => ({ ...r })))
  let nextId = Math.max(0, ...SEED_REVIEWS.map((r) => r.id)) + 1

  /** Reviews for a school, newest first. */
  function forSchool(schoolId: number): Review[] {
    return reviews.value
      .filter((r) => r.schoolId === schoolId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }

  function ownReview(schoolId: number, username: string): Review | undefined {
    return reviews.value.find((r) => r.schoolId === schoolId && r.username === username)
  }

  /** Stores a new review. Returns an inline error message, or an empty string on success. */
  function submit(schoolId: number, username: string, rawText: string): string {
    const text = sanitizeReviewText(rawText)
    if (!text) return BLANK_REVIEW_ERROR
    if (ownReview(schoolId, username)) return 'You have already reviewed this school.'
    reviews.value.push({
      id: nextId++,
      schoolId,
      username,
      createdAt: new Date().toISOString(),
      text,
    })
    return ''
  }

  /** Updates the author's own review. Returns an inline error message, or '' on success. */
  function edit(reviewId: number, username: string, rawText: string): string {
    const text = sanitizeReviewText(rawText)
    if (!text) return BLANK_REVIEW_ERROR
    const review = reviews.value.find((r) => r.id === reviewId && r.username === username)
    if (!review) return 'You can only edit your own review.'
    review.text = text
    review.updatedAt = new Date().toISOString()
    return ''
  }

  /** Deletes the author's own review. Returns false when it does not exist or is not theirs. */
  function remove(reviewId: number, username: string): boolean {
    const before = reviews.value.length
    reviews.value = reviews.value.filter((r) => !(r.id === reviewId && r.username === username))
    return reviews.value.length < before
  }

  return { reviews, forSchool, ownReview, submit, edit, remove }
})
