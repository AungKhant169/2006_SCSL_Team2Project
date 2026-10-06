import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SCHOOLS } from '@/data/schools'

/** Demo bookmarks the design starts with until the backend stores them per account. */
const SEED_BOOKMARKS = [2, 9]

/** The signed-in student's saved institutions (UC-2.5 to UC-2.7). */
export const useBookmarksStore = defineStore('bookmarks', () => {
  const ids = ref<number[]>([...SEED_BOOKMARKS])

  const count = computed(() => ids.value.length)
  const schools = computed(() => SCHOOLS.filter((s) => ids.value.includes(s.id)))

  function has(id: number): boolean {
    return ids.value.includes(id)
  }

  function add(id: number) {
    if (!has(id)) ids.value = [...ids.value, id]
  }

  function remove(id: number) {
    ids.value = ids.value.filter((x) => x !== id)
  }

  function toggle(id: number) {
    if (has(id)) remove(id)
    else add(id)
  }

  function reset() {
    ids.value = [...SEED_BOOKMARKS]
  }

  return { ids, count, schools, has, add, remove, toggle, reset }
})
