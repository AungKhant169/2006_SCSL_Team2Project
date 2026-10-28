import type { MapPin } from '@/types/map'

/** The pin for the point distances are measured from, which is the centre of a postal district. */
export function homePin(
  origin: { latitude: number; longitude: number; district: string },
  name: string,
): MapPin {
  return {
    at: [origin.latitude, origin.longitude],
    mark: 'home',
    label: name,
    heading: name,
    lines: [origin.district],
  }
}
