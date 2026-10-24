import { ref } from 'vue'
import { defineStore } from 'pinia'
import { locatePostalCode } from '@/services/locationService'
import type { Origin } from '@/services/locationService'
import type { School } from '@/types/school'
import { distanceKm } from '@/utils/distance'
import { isValidPostalCode } from '@/utils/postalCode'

/**
 * Where postal codes are, as the server places them. Distances are measured from the centre of the
 * code's postal district, the same point the rule-based roadmap ranks by.
 */
export const useLocationStore = defineStore('location', () => {
  /** Looked-up postal codes. null means the server could not place the code. */
  const origins = ref<Record<string, Origin | null>>({})
  const inFlight = new Map<string, Promise<void>>()

  /** Looks the postal code up once. An unreachable server is not cached, so the next call retries. */
  function locate(postal: string): Promise<void> {
    if (!isValidPostalCode(postal) || postal in origins.value) return Promise.resolve()
    let request = inFlight.get(postal)
    if (!request) {
      request = locatePostalCode(postal)
        .then(
          (origin) => {
            origins.value[postal] = origin
          },
          () => undefined,
        )
        .finally(() => inFlight.delete(postal))
      inFlight.set(postal, request)
    }
    return request
  }

  function originOf(postal: string): Origin | null {
    return origins.value[postal] ?? null
  }

  /** True once the server has said it cannot place this postal code. */
  function isUnplaced(postal: string): boolean {
    return postal in origins.value && origins.value[postal] === null
  }

  /** The school with its distance from the postal code, or null when the code is not located. */
  function withDistance<T extends School>(school: T, postal: string): T {
    return { ...school, distanceKm: distanceKm(originOf(postal), school) }
  }

  return { locate, originOf, isUnplaced, withDistance }
})
