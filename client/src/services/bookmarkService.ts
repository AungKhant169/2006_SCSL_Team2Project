import type { School } from '@/types/school'
import { authorizedRequest } from './authorizedRequest'
import { toSchool } from './schoolService'
import type { SchoolSummaryPayload } from './schoolService'

/** The signed-in student's bookmarked schools, in the order they were saved. */
export async function listBookmarks(): Promise<School[]> {
  const payloads = await authorizedRequest<SchoolSummaryPayload[]>('/bookmark')
  return payloads.map((payload) => toSchool(payload))
}

export function addBookmark(schoolId: number): Promise<void> {
  return authorizedRequest<void>(`/bookmark/${schoolId}`, { method: 'PUT' })
}

export function removeBookmark(schoolId: number): Promise<void> {
  return authorizedRequest<void>(`/bookmark/${schoolId}`, { method: 'DELETE' })
}
