const EARTH_RADIUS_KM = 6371

export interface Point {
  latitude: number
  longitude: number
}

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance in km, the same formula the server's rule-based roadmap ranks by. */
export function haversineKm(from: Point, to: Point): number {
  const dLat = radians(to.latitude - from.latitude)
  const dLon = radians(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** Distance from an origin to a school, or null when either end is unknown. */
export function distanceKm(
  origin: Point | null,
  school: { latitude: number | null; longitude: number | null },
): number | null {
  if (!origin || school.latitude === null || school.longitude === null) return null
  return haversineKm(origin, { latitude: school.latitude, longitude: school.longitude })
}
