import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { DistanceFilter, SortOrder } from '@/data/education'
import { fetchSchoolsOfTier } from '@/services/schoolService'
import type { DirectoryTierId, School } from '@/types/school'
import { sanitizePostalInput } from '@/utils/postalCode'
import { paginate, searchSchools } from '@/utils/schoolSearch'
import { parseSearchQuery } from '@/utils/searchQuery'
import { useLocationStore } from './location'

export const DEFAULT_POSTAL = '556000'

export type DirectoryStatus = 'loading' | 'ready' | 'error'

/** Search, filter, sort and pagination state of the school directory (UC-1.1). */
export const useDirectoryStore = defineStore('directory', () => {
  const location = useLocationStore()

  const tier = ref<DirectoryTierId>('primary')
  const query = ref('')
  /** Governance type to keep, e.g. "Government-Aided"; empty keeps every type. */
  const schoolType = ref('')
  const distance = ref<DistanceFilter>('any')
  const sort = ref<SortOrder>('az')
  const page = ref(1)
  /** Reference postal code that distances are measured from. */
  const postal = ref(DEFAULT_POSTAL)

  /** Every school of a tier, fetched once; the search itself runs on this list. */
  const catalogue = ref<Partial<Record<DirectoryTierId, School[]>>>({})
  const failed = ref<Partial<Record<DirectoryTierId, boolean>>>({})
  const requests = new Map<DirectoryTierId, Promise<School[]>>()

  const parsedQuery = computed(() => parseSearchQuery(query.value))
  const queryError = computed(() => parsedQuery.value.error)
  /** Distances can be shown once the server has placed the postal code. */
  const hasPostal = computed(() => location.originOf(postal.value) !== null)
  /** A complete postal code the server could not place, as opposed to one still being typed. */
  const postalUnknown = computed(() => location.isUnplaced(postal.value))

  const current = computed(() => catalogue.value[tier.value])
  const status = computed<DirectoryStatus>(() => {
    if (current.value) return 'ready'
    return failed.value[tier.value] ? 'error' : 'loading'
  })

  /** True when the dataset has no school at all in the tier, whatever the filters. */
  const tierEmpty = computed(() => status.value === 'ready' && current.value?.length === 0)

  /** The tier's schools with their distance from the reference postal code. */
  const schools = computed(() =>
    (current.value ?? []).map((school) => location.withDistance(school, postal.value)),
  )
  /** Governance types present in the tier, for the filter. */
  const schoolTypes = computed(() =>
    [...new Set(schools.value.map((s) => s.type))].filter(Boolean).sort(),
  )

  const matches = computed(() =>
    searchSchools(schools.value, {
      term: parsedQuery.value.term,
      schoolType: schoolType.value,
      maxKm: hasPostal.value && distance.value !== 'any' ? Number(distance.value) : Infinity,
      sort: sort.value,
    }),
  )
  const paged = computed(() => paginate(matches.value, page.value))
  const results = computed(() => paged.value.items)
  const currentPage = computed(() => paged.value.page)
  const pageCount = computed(() => paged.value.pageCount)

  /** Fetches a tier's schools unless they are already here. Shared by concurrent callers. */
  function loadTier(id: DirectoryTierId): Promise<School[]> {
    const cached = catalogue.value[id]
    if (cached) return Promise.resolve(cached)
    let request = requests.get(id)
    if (!request) {
      failed.value[id] = false
      request = fetchSchoolsOfTier(id)
        .then((list) => {
          catalogue.value[id] = list
          return list
        })
        .catch(() => {
          failed.value[id] = true
          return []
        })
        .finally(() => requests.delete(id))
      requests.set(id, request)
    }
    return request
  }

  /** Loads the tier being browsed. */
  function load() {
    return loadTier(tier.value)
  }

  /** Forgets the fetched schools, e.g. after an administrator replaced the dataset. */
  function clearCatalogue() {
    catalogue.value = {}
    failed.value = {}
  }

  // Any change to the criteria returns to the first page; the tier's schools load on demand.
  watch([query, schoolType, distance, sort, postal, tier], () => (page.value = 1), {
    flush: 'sync',
  })
  watch(
    tier,
    () => {
      schoolType.value = ''
      void load()
    },
    { flush: 'sync' },
  )
  watch(postal, (value) => void location.locate(value), { immediate: true })

  function setPostal(value: string) {
    postal.value = sanitizePostalInput(value)
  }

  /** Restores every search input to its default and reloads the full list (REQ-1.15). */
  function resetFilters() {
    query.value = ''
    schoolType.value = ''
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
    schoolType,
    distance,
    sort,
    postal,
    status,
    queryError,
    hasPostal,
    postalUnknown,
    tierEmpty,
    schoolTypes,
    matches,
    results,
    currentPage,
    pageCount,
    load,
    loadTier,
    clearCatalogue,
    setPostal,
    resetFilters,
    previousPage,
    nextPage,
  }
})
