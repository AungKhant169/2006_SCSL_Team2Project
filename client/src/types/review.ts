export interface Review {
  id: number
  schoolId: number
  username: string
  /** ISO timestamp the review was first posted. */
  createdAt: string
  /** ISO timestamp of the last edit, absent when never edited. */
  updatedAt?: string
  text: string
}
