/** What one pin on a map says. */
export interface MapPin {
  /** Latitude and longitude. */
  at: [number, number]
  /** A recommended school's step number, or an icon for a single school or the reference point. */
  mark: number | 'school' | 'home'
  /** Names the pin for assistive technology and its tooltip. */
  label: string
  heading: string
  lines: string[]
}
