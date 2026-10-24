import { describe, expect, it } from 'vitest'
import { distanceKm, haversineKm } from '../distance'

const HOUGANG = { latitude: 1.37, longitude: 103.893 }
const JURONG = { latitude: 1.333, longitude: 103.743 }

describe('haversineKm', () => {
  it('is zero between a point and itself', () => {
    expect(haversineKm(HOUGANG, HOUGANG)).toBe(0)
  })

  it('measures the great-circle distance between two places in Singapore', () => {
    // Hougang to Jurong: about 4.1 km north-south and 16.7 km east-west.
    expect(haversineKm(HOUGANG, JURONG)).toBeCloseTo(17.2, 1)
  })

  it('is the same in both directions', () => {
    expect(haversineKm(HOUGANG, JURONG)).toBeCloseTo(haversineKm(JURONG, HOUGANG), 10)
  })
})

describe('distanceKm', () => {
  it('measures from the origin to a school', () => {
    expect(distanceKm(HOUGANG, JURONG)).toBeCloseTo(haversineKm(HOUGANG, JURONG), 10)
  })

  it('is unknown without an origin', () => {
    expect(distanceKm(null, JURONG)).toBeNull()
  })

  it('is unknown for a school without coordinates', () => {
    expect(distanceKm(HOUGANG, { latitude: null, longitude: null })).toBeNull()
    expect(distanceKm(HOUGANG, { latitude: 1.3, longitude: null })).toBeNull()
  })
})
