import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Origin } from '@/services/locationService'
import type { PlanNode } from '@/types/roadmap'
import PlanMap from '../PlanMap.vue'

const node = (step: number, schoolName: string, overrides: Partial<PlanNode> = {}): PlanNode => ({
  step,
  label: ['1st choice', '2nd choice', '3rd choice'][step - 1]!,
  schoolName,
  detail: `${step}.0 km from 556000`,
  latitude: 1.3 + step / 100,
  longitude: 103.8 + step / 100,
  ...overrides,
})

const nodes = [node(1, 'Rosyth School'), node(2, 'Tao Nan School'), node(3, 'Raffles Institution')]
const origin: Origin = { latitude: 1.37, longitude: 103.893, district: 'Hougang' }

async function mountMap(props: { nodes?: PlanNode[]; origin?: Origin | null; tone?: 'ai' } = {}) {
  const wrapper = mount(PlanMap, { props: { nodes, origin: null, ...props } })
  await flushPromises()
  return wrapper
}

const pins = (wrapper: Awaited<ReturnType<typeof mountMap>>) =>
  wrapper.findAll('.leaflet-marker-icon')

describe('PlanMap', () => {
  it('pins each school with the number of its step', async () => {
    const wrapper = await mountMap()
    expect(wrapper.find('.leaflet-container').exists()).toBe(true)
    expect(pins(wrapper).map((pin) => pin.text())).toEqual(['1', '2', '3'])
  })

  it('names each pin for assistive technology', async () => {
    const wrapper = await mountMap()
    expect(pins(wrapper).map((pin) => pin.attributes('aria-label'))).toEqual([
      '1st choice: Rosyth School',
      '2nd choice: Tao Nan School',
      '3rd choice: Raffles Institution',
    ])
    expect(wrapper.get('[role="region"]').attributes('aria-label')).toBe(
      'Map of the recommended schools',
    )
  })

  it('marks where the postal code is once it is known, and explains the marker', async () => {
    const wrapper = await mountMap({ origin })
    expect(pins(wrapper)).toHaveLength(4)
    expect(
      wrapper.get('.map-pin-home').element.closest('[aria-label]')?.getAttribute('aria-label'),
    ).toBe('Your postal district')
    expect(wrapper.get('figcaption').text()).toContain('centre of your postal district')
  })

  it('has no home pin until the postal code is located', async () => {
    const wrapper = await mountMap()
    expect(wrapper.find('.map-pin-home').exists()).toBe(false)
    expect(wrapper.get('figcaption').text()).not.toContain('postal district')

    await wrapper.setProps({ origin })
    expect(wrapper.find('.map-pin-home').exists()).toBe(true)
  })

  it('colours the pins to match the plan', async () => {
    expect((await mountMap()).findAll('.map-pin-primary')).toHaveLength(3)
    const ai = await mountMap({ tone: 'ai' })
    expect(ai.findAll('.map-pin-ai')).toHaveLength(3)
    expect(ai.find('.map-pin-primary').exists()).toBe(false)
  })

  it('says which choices cannot be shown for want of a location', async () => {
    const wrapper = await mountMap({
      nodes: [
        node(1, 'Rosyth School'),
        node(2, 'No Position School', { latitude: null, longitude: null }),
        node(3, 'Not available', { latitude: null, longitude: null }),
      ],
    })
    expect(pins(wrapper)).toHaveLength(1)
    expect(wrapper.get('figcaption').text()).toContain(
      'Not shown, as their location is not available: 2nd choice, 3rd choice.',
    )
  })

  it('draws no map when there is nothing to put on it', async () => {
    for (const none of [[], [node(1, 'No Position School', { latitude: null, longitude: null })]]) {
      const wrapper = await mountMap({ nodes: none, origin })
      expect(wrapper.find('.leaflet-container').exists()).toBe(false)
      expect(wrapper.find('figure').exists()).toBe(false)
    }
  })

  it('follows the plan when it changes, and goes away when it empties', async () => {
    const wrapper = await mountMap()
    await wrapper.setProps({ nodes: [node(1, 'Tao Nan School')] })
    expect(pins(wrapper).map((pin) => pin.attributes('aria-label'))).toEqual([
      '1st choice: Tao Nan School',
    ])

    await wrapper.setProps({ nodes: [] })
    expect(wrapper.find('.leaflet-container').exists()).toBe(false)

    await wrapper.setProps({ nodes })
    await flushPromises()
    expect(pins(wrapper)).toHaveLength(3)
  })

  it('leaves the map alone when the plan is recomputed to the same pins', async () => {
    const wrapper = await mountMap({ origin })
    const before = pins(wrapper).map((pin) => pin.element)
    // The roadmap store hands over a new array whenever any school is described.
    await wrapper.setProps({ nodes: nodes.map((n) => ({ ...n })) })
    expect(pins(wrapper).map((pin) => pin.element)).toEqual(before)
  })
})
