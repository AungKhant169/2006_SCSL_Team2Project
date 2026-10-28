import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { toSchoolProfile } from '@/services/schoolService'
import type { Origin } from '@/services/locationService'
import { SCHOOLS } from '@/test/fixtures'
import type { SchoolProfile } from '@/types/school'
import SchoolLocationCard from '../SchoolLocationCard.vue'

/** Rosyth School, which the fixtures place at 1.375, 103.885. */
const rosyth = (overrides: Partial<SchoolProfile> = {}): SchoolProfile => ({
  ...toSchoolProfile(SCHOOLS.find((s) => s.id === 2)!),
  ...overrides,
})
const origin: Origin = { latitude: 1.37, longitude: 103.893, district: 'Hougang' }

async function mountCard(
  props: { school?: SchoolProfile; origin?: Origin | null; postal?: string } = {},
) {
  const wrapper = mount(SchoolLocationCard, {
    props: { school: rosyth(), origin: null, postal: '556000', ...props },
  })
  await flushPromises()
  return wrapper
}

const markers = (wrapper: Awaited<ReturnType<typeof mountCard>>) =>
  wrapper.findAll('.leaflet-marker-icon')

describe('SchoolLocationCard', () => {
  it('pins the school on a map named for it', async () => {
    const wrapper = await mountCard()
    expect(wrapper.get('h2').text()).toBe('Location')
    expect(wrapper.get('[role="region"]').attributes('aria-label')).toBe(
      'Map showing Rosyth School',
    )
    expect(markers(wrapper).map((marker) => marker.attributes('aria-label'))).toEqual([
      'Rosyth School',
    ])
    expect(wrapper.find('.map-pin-primary').exists()).toBe(true)
  })

  it('says where the school is and its nearest MRT station when its pin is opened', async () => {
    const wrapper = await mountCard()
    await markers(wrapper)[0]!.trigger('click')
    const popup = wrapper.get('.leaflet-popup-content')
    expect(popup.text()).toContain('Rosyth School')
    expect(popup.text()).toContain('2 Example Road, Singapore 100002')
    expect(popup.text()).toContain('Nearest MRT: Station 2')
  })

  it('leaves out what the dataset lacks rather than printing blanks', async () => {
    const wrapper = await mountCard({ school: rosyth({ address: '', postal: '', mrt: '' }) })
    await markers(wrapper)[0]!.trigger('click')
    const popup = wrapper.get('.leaflet-popup-content')
    expect(popup.text()).toBe('Rosyth School')
  })

  it('marks the reference postal district, and explains the marker', async () => {
    const wrapper = await mountCard({ origin })
    expect(markers(wrapper).map((marker) => marker.attributes('aria-label'))).toEqual([
      'Distance reference point',
      'Rosyth School',
    ])
    expect(wrapper.get('figcaption').text()).toContain(
      'centre of the postal district of 556000, where the distance above is measured from',
    )
  })

  it('has no reference point, or caption, until the postal code is located', async () => {
    const wrapper = await mountCard()
    expect(wrapper.find('.map-pin-home').exists()).toBe(false)
    expect(wrapper.find('figcaption').exists()).toBe(false)

    await wrapper.setProps({ origin })
    expect(wrapper.find('.map-pin-home').exists()).toBe(true)
  })

  it('says "Not available" for a school the dataset cannot place', async () => {
    const wrapper = await mountCard({
      school: rosyth({ latitude: null, longitude: null }),
      origin,
    })
    expect(wrapper.text()).toContain('Not available')
    expect(wrapper.find('.leaflet-container').exists()).toBe(false)
    expect(wrapper.find('figcaption').exists()).toBe(false)
  })
})
