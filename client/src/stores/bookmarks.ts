import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as bookmarkService from '@/services/bookmarkService'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import type { School } from '@/types/school'
import { useUiStore } from './ui'

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : GENERIC_ERROR)

/** The signed-in student's saved institutions (UC-2.5 to UC-2.7), kept on the server. */
export const useBookmarksStore = defineStore('bookmarks', () => {
  const ui = useUiStore()

  /** Bookmarked schools in the order they were saved, as the server lists them. */
  const schools = ref<School[]>([])
  /** Ids with a request in flight, so a second click cannot race the first. */
  const pending = ref<number[]>([])

  const ids = computed(() => schools.value.map((s) => s.id))
  const count = computed(() => schools.value.length)

  function has(id: number): boolean {
    return ids.value.includes(id)
  }

  function isPending(id: number): boolean {
    return pending.value.includes(id)
  }

  /** Fetches the account's bookmarks. A failure leaves the list as it was and says so. */
  async function load() {
    try {
      schools.value = await bookmarkService.listBookmarks()
    } catch (error) {
      ui.setNotice(messageOf(error))
    }
  }

  /** Runs a change to one bookmark, then updates the list. Failures raise a notice. */
  async function change(
    id: number,
    request: () => Promise<void>,
    apply: () => void | Promise<void>,
  ) {
    if (isPending(id)) return
    pending.value = [...pending.value, id]
    try {
      await request()
      await apply()
    } catch (error) {
      ui.setNotice(messageOf(error))
    } finally {
      pending.value = pending.value.filter((x) => x !== id)
    }
  }

  async function add(id: number) {
    // The server holds the details of the school, so its list is fetched again.
    if (!has(id)) await change(id, () => bookmarkService.addBookmark(id), load)
  }

  async function remove(id: number) {
    if (!has(id)) return
    await change(
      id,
      () => bookmarkService.removeBookmark(id),
      () => {
        schools.value = schools.value.filter((s) => s.id !== id)
      },
    )
  }

  async function toggle(id: number) {
    if (has(id)) await remove(id)
    else await add(id)
  }

  function reset() {
    schools.value = []
    pending.value = []
  }

  return { schools, ids, count, has, isPending, load, add, remove, toggle, reset }
})
