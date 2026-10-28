import { describe, expect, it } from 'vitest'
import { homePin } from '../mapPin'

describe('homePin', () => {
  it('pins the origin under the given name, saying which district it is the centre of', () => {
    const origin = { latitude: 1.37, longitude: 103.893, district: 'Hougang' }
    expect(homePin(origin, 'Your postal district')).toEqual({
      at: [1.37, 103.893],
      mark: 'home',
      label: 'Your postal district',
      heading: 'Your postal district',
      lines: ['Hougang'],
    })
  })
})
