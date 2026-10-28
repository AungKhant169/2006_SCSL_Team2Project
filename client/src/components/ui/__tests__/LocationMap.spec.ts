import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { MapPin } from '@/types/map'
import LocationMap from '../LocationMap.vue'

const pin = (mark: MapPin['mark'], label: string, overrides: Partial<MapPin> = {}): MapPin => ({
  at: [1.3 + (typeof mark === 'number' ? mark : 0) / 100, 103.8],
  mark,
  label,
  heading: label,
  lines: [],
  ...overrides,
})

const pins = [pin(1, 'First'), pin(2, 'Second'), pin('school', 'A school'), pin('home', 'Home')]

async function mountMap(props: { pins?: MapPin[]; tone?: 'ai' } = {}) {
  const wrapper = mount(LocationMap, { props: { pins, label: 'Map of things', ...props } })
  await flushPromises()
  return wrapper
}

const markers = (wrapper: Awaited<ReturnType<typeof mountMap>>) =>
  wrapper.findAll('.leaflet-marker-icon')

describe('LocationMap', () => {
  it('draws a map named for assistive technology', async () => {
    const wrapper = await mountMap()
    expect(wrapper.get('[role="region"]').attributes('aria-label')).toBe('Map of things')
    expect(wrapper.element.classList.contains('leaflet-container')).toBe(true)
  })

  it('takes its height from the class the caller gives it', async () => {
    const wrapper = mount(LocationMap, { props: { pins, label: 'm' }, attrs: { class: 'h-72' } })
    await flushPromises()
    expect(wrapper.element.classList.contains('h-72')).toBe(true)
    expect(wrapper.element.classList.contains('leaflet-container')).toBe(true)
  })

  it('numbers a step pin, and gives a school and the reference point an icon', async () => {
    const wrapper = await mountMap()
    const [first, second, school, home] = markers(wrapper)
    expect([first!.text(), second!.text()]).toEqual(['1', '2'])
    expect(school!.find('svg').exists()).toBe(true)
    expect(school!.text()).toBe('')
    expect(home!.find('svg').exists()).toBe(true)
    expect(home!.find('.map-pin-home').exists()).toBe(true)
  })

  it('names each pin for assistive technology', async () => {
    const wrapper = await mountMap()
    expect(markers(wrapper).map((marker) => marker.attributes('aria-label'))).toEqual([
      'First',
      'Second',
      'A school',
      'Home',
    ])
  })

  it('credits the map provider', async () => {
    const credit = (await mountMap()).get('.leaflet-control-attribution')
    expect(credit.text()).toContain('OneMap')
    expect(credit.text()).toContain('Singapore Land Authority')
  })

  it('colours step and school pins to match the plan, and the reference point never', async () => {
    const primary = await mountMap()
    expect(primary.findAll('.map-pin-primary')).toHaveLength(3)
    const ai = await mountMap({ tone: 'ai' })
    expect(ai.findAll('.map-pin-ai')).toHaveLength(3)
    expect(ai.find('.map-pin-primary').exists()).toBe(false)
    expect(ai.findAll('.map-pin-home')).toHaveLength(1)
  })

  it('follows the pins when they change', async () => {
    const wrapper = await mountMap()
    await wrapper.setProps({ pins: [pin(1, 'Only')] })
    expect(markers(wrapper).map((marker) => marker.attributes('aria-label'))).toEqual(['Only'])
  })

  it('leaves the map alone when the pins are handed over again unchanged', async () => {
    const wrapper = await mountMap()
    const before = markers(wrapper).map((marker) => marker.element)
    await wrapper.setProps({ pins: pins.map((p) => ({ ...p })) })
    expect(markers(wrapper).map((marker) => marker.element)).toEqual(before)
  })

  it('shows names and addresses as text, never as markup', async () => {
    const hostile = '<img src=x onerror="window.pwned = 1">'
    const wrapper = await mountMap({
      pins: [pin(1, 'Safe label', { heading: hostile, lines: [hostile] })],
    })
    await markers(wrapper)[0]!.trigger('click')
    const popup = wrapper.get('.leaflet-popup-content')
    expect(popup.text()).toContain(hostile)
    expect(popup.find('img').exists()).toBe(false)
    expect(wrapper.find('.map-pin img').exists()).toBe(false)
  })

  it('tears the map down with the component', async () => {
    const wrapper = await mountMap()
    const container = wrapper.element
    expect(container.querySelector('.leaflet-map-pane')).not.toBeNull()
    wrapper.unmount()
    expect(container.querySelector('.leaflet-map-pane')).toBeNull()
  })
})
