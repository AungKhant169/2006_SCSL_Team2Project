import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { schoolsOf, makeSchool } from '@/test/fixtures'
import { mountWithApp, signInAs } from '@/test/helpers'
import type { School } from '@/types/school'
import SchoolSummaryCard from '../SchoolSummaryCard.vue'

const named = (tier: 'primary' | 'secondary' | 'postsec', name: string): School =>
  schoolsOf(tier).find((s) => s.name === name)!

const mountCard = (school: School) => mountWithApp(SchoolSummaryCard, { props: { school } })

describe('SchoolSummaryCard (REQ-1.7, REQ-1.8, REQ-1.13)', () => {
  it('shows identity, location, the tier benchmark and the distance', async () => {
    const { wrapper } = await mountCard({ ...named('primary', 'Rosyth School'), distanceKm: 1.4 })
    const text = wrapper.text()
    expect(text).toContain('Rosyth School')
    expect(text).toContain('Government')
    expect(text).toContain('Hougang · 100002 · Nearest MRT: Station 2')
    expect(text).toContain('Places taken (Phase 2B)')
    expect(text).toContain('95 places')
    expect(text).toContain('1.4 km')
    expect(wrapper.find('span[aria-label="Rosyth School badge"], img').exists()).toBe(true)
  })

  it.each([
    ['secondary', 'Raffles Institution', 'PSLE T-score cut-off', 'T-score ≥ 260'],
    ['postsec', 'Temasek Junior College', 'JAE cut-off', 'Not available'],
  ] as const)('uses the benchmark that fits %s school %s', async (tier, name, label, value) => {
    const { wrapper } = await mountCard(named(tier, name))
    expect(wrapper.text()).toContain(label)
    expect(wrapper.text()).toContain(value)
  })

  it('links the card to the school profile by its key', async () => {
    const { wrapper, router } = await mountCard(named('primary', 'Rosyth School'))
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/schools/rosyth')
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schools/rosyth')
  })

  it('escapes a key with spaces in the address', async () => {
    const { wrapper } = await mountCard(named('primary', 'Nanyang Primary School'))
    expect(wrapper.get('a').attributes('href')).toBe('/schools/nanyang%20primary')
  })

  it('prompts for a postal code instead of a distance when none is located', async () => {
    const { wrapper } = await mountCard(named('primary', 'Rosyth School'))
    expect(wrapper.text()).toContain('Add postal code')
  })

  it('copes with a school the dataset knows little about', async () => {
    const { wrapper } = await mountCard(makeSchool({ type: '', area: '', postal: '', mrt: '' }))
    expect(wrapper.text()).toContain('Area not available · No postal code')
    expect(wrapper.text()).not.toContain('Nearest MRT')
    expect(wrapper.text()).toContain('Not available')
  })

  it('hides the bookmark control from guests and shows it after login', async () => {
    const { wrapper, api } = await mountCard(named('primary', 'Rosyth School'))
    api.bookmark('planner2026', 2)
    expect(wrapper.find('button').exists()).toBe(false)
    await signInAs('planner2026')
    await flushPromises()
    expect(wrapper.get('button').text()).toBe('★ Saved')
  })
})
