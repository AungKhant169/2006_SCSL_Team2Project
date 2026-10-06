import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { DistanceFilter, FieldFilter, GovernanceFilter, SortOrder } from '@/data/education'
import { SCHOOLS } from '@/data/schools'
import type { DirectoryTierId } from '@/types/school'
import { isValidPostalCode, sanitizePostalInput } from '@/utils/postalCode'
import { paginate, searchSchools } from '@/utils/schoolSearch'
import { parseSearchQuery } from '@/utils/searchQuery'

export const DEFAULT_POSTAL = '556000'

/** Search, filter, sort and pagination state of the school directory (UC-1.1). */
export const useDirectoryStore = defineStore('directory', () => {
  const tier = ref<DirectoryTierId>('primary')
  const query = ref('')
  const gov = ref<GovernanceFilter>('All')
  const field = ref<FieldFilter>('All')
  const distance = ref<DistanceFilter>('any')
  const sort = ref<SortOrder>('az')
  const page = ref(1)
  /** Reference postal code that distances are measured from. */
  const postal = ref(DEFAULT_POSTAL)

  const parsedQuery = computed(() => parseSearchQuery(query.value))
  const queryError = computed(() => parsedQuery.value.error)
  const hasPostal = computed(() => isValidPostalCode(postal.value))

  const matches = computed(() =>
    searchSchools(SCHOOLS, {
      tier: tier.value,
      term: parsedQuery.value.term,
      gov: gov.value,
      field: field.value,
      distance: distance.value,
      sort: sort.value,
    }),
  )
  const paged = computed(() => paginate(matches.value, page.value))
  const results = computed(() => paged.value.items)
  const currentPage = computed(() => paged.value.page)
  const pageCount = computed(() => paged.value.pageCount)
  const isTertiary = computed(() => tier.value === 'postsec' || tier.value === 'uni')

  // Any change to the criteria returns to the first page; switching tier drops the field filter.
  watch([query, gov, field, distance, sort, postal, tier], () => (page.value = 1), {
    flush: 'sync',
  })
  watch(tier, () => (field.value = 'All'), { flush: 'sync' })

  function setPostal(value: string) {
    postal.value = sanitizePostalInput(value)
  }

  /** Restores every search input to its default and reloads the full list (REQ-1.15). */
  function resetFilters() {
    query.value = ''
    gov.value = 'All'
    field.value = 'All'
    distance.value = 'any'
    sort.value = 'az'
    page.value = 1
  }

  function previousPage() {
    page.value = Math.max(1, currentPage.value - 1)
  }

  function nextPage() {
    page.value = Math.min(pageCount.value, currentPage.value + 1)
  }

  return {
    tier,
    query,
    gov,
    field,
    distance,
    sort,
    postal,
    queryError,
    hasPostal,
    matches,
    results,
    currentPage,
    pageCount,
    isTertiary,
    setPostal,
    resetFilters,
    previousPage,
    nextPage,
  }
})
