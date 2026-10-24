import type { Point } from '@/utils/distance'
import { ApiError, apiRequest } from './http'

interface LocationPayload {
  postal: string
  district: string
  latitude: number
  longitude: number
}

/** Where distances from a postal code are measured from: the centre of its postal district. */
export interface Origin extends Point {
  district: string
}

/** The origin of a postal code, or null when the server cannot place it. */
export async function locatePostalCode(postal: string): Promise<Origin | null> {
  try {
    const place = await apiRequest<LocationPayload>(`/location/${encodeURIComponent(postal)}`)
    return { latitude: place.latitude, longitude: place.longitude, district: place.district }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
