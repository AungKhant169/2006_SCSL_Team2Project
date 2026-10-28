/*
 * The basemap behind the roadmap map. OneMap is Singapore's national map, run by the Singapore
 * Land Authority: free to use without a key, and it labels buildings, roads and stations at a
 * level of detail a global provider does not. To switch provider, change the template and the
 * attribution here, e.g. OpenStreetMap: https://tile.openstreetmap.org/{z}/{x}/{y}.png
 */
export const MAP_TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'

/** Credit OneMap asks every map built on its tiles to show. */
export const MAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" alt="" class="inline size-5 align-text-bottom" /> ' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | ' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'

/** The area OneMap has tiles for: south-west and north-east corners as [latitude, longitude]. */
export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [1.144, 103.535],
  [1.494, 104.502],
]

export const MAP_MIN_ZOOM = 11
export const MAP_MAX_ZOOM = 19
