import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHOOLS } from '@/test/fixtures'
import { authorizedRequest } from '../authorizedRequest'
import { addBookmark, listBookmarks, removeBookmark } from '../bookmarkService'

vi.mock('../authorizedRequest', () => ({ authorizedRequest: vi.fn() }))
const request = vi.mocked(authorizedRequest)

describe('bookmarkService (matches the /bookmark API contract)', () => {
  beforeEach(() => request.mockReset())

  it('lists the bookmarked schools in the order the server gives', async () => {
    request.mockResolvedValue([SCHOOLS[1], SCHOOLS[0]])
    const schools = await listBookmarks()
    expect(request).toHaveBeenCalledWith('/bookmark')
    expect(schools.map((s) => s.id)).toEqual([2, 1])
    expect(schools[0]).toMatchObject({ name: 'Rosyth School', key: 'rosyth' })
  })

  it('adds a bookmark with PUT', async () => {
    request.mockResolvedValue(undefined)
    await addBookmark(7)
    expect(request).toHaveBeenCalledWith('/bookmark/7', { method: 'PUT' })
  })

  it('removes a bookmark with DELETE', async () => {
    request.mockResolvedValue(undefined)
    await removeBookmark(7)
    expect(request).toHaveBeenCalledWith('/bookmark/7', { method: 'DELETE' })
  })
})
