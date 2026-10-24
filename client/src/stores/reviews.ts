import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import * as reviewService from '@/services/reviewService'
import type { Review } from '@/types/review'
import { BLANK_REVIEW_ERROR, sanitizeReviewText } from '@/utils/reviewText'

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : GENERIC_ERROR)

/** School reviews (UC-4.1 to UC-4.4), kept on the server. One review per account per school (BR-6). */
export const useReviewsStore = defineStore('reviews', () => {
  /** Reviews already fetched, by school. */
  const bySchool = ref<Record<number, Review[]>>({})

  /** Reviews for a school, newest first. Empty until they have been loaded. */
  function forSchool(schoolId: number): Review[] {
    return (bySchool.value[schoolId] ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }

  function ownReview(schoolId: number, username: string): Review | undefined {
    return forSchool(schoolId).find((r) => r.username === username)
  }

  /** Fetches a school's reviews. Returns an error message, or an empty string on success. */
  async function load(schoolId: number): Promise<string> {
    try {
      bySchool.value[schoolId] = await reviewService.listReviews(schoolId)
      return ''
    } catch (error) {
      return messageOf(error)
    }
  }

  function replace(review: Review) {
    const others = (bySchool.value[review.schoolId] ?? []).filter((r) => r.id !== review.id)
    bySchool.value[review.schoolId] = [...others, review]
  }

  /** Stores a new review. Returns an inline error message, or an empty string on success. */
  async function submit(schoolId: number, username: string, rawText: string): Promise<string> {
    const text = sanitizeReviewText(rawText)
    if (!text) return BLANK_REVIEW_ERROR
    if (ownReview(schoolId, username)) return 'You have already reviewed this school.'
    try {
      replace(await reviewService.submitReview(schoolId, text))
      return ''
    } catch (error) {
      return messageOf(error)
    }
  }

  /** Updates the author's own review. Returns an inline error message, or '' on success. */
  async function edit(reviewId: number, rawText: string): Promise<string> {
    const text = sanitizeReviewText(rawText)
    if (!text) return BLANK_REVIEW_ERROR
    try {
      replace(await reviewService.editReview(reviewId, text))
      return ''
    } catch (error) {
      return messageOf(error)
    }
  }

  /** Deletes the author's own review. Returns an error message, or '' on success. */
  async function remove(schoolId: number, reviewId: number): Promise<string> {
    try {
      await reviewService.deleteReview(reviewId)
      bySchool.value[schoolId] = (bySchool.value[schoolId] ?? []).filter((r) => r.id !== reviewId)
      return ''
    } catch (error) {
      return messageOf(error)
    }
  }

  return { bySchool, forSchool, ownReview, load, submit, edit, remove }
})
