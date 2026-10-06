import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { getSchool } from '@/data/schools'
import { mountWithApp, signInAs, stubAuthApi } from '@/test/helpers'
import SchoolSummaryCard from '../SchoolSummaryCard.vue'

const mountCard = (id: number, hasPostal = true) =>
  mountWithApp(SchoolSummaryCard, { props: { school: getSchool(id)!, hasPostal } })

describe('SchoolSummaryCard (REQ-1.7, REQ-1.8, REQ-1.13)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows identity, location and the tier benchmark', async () => {
    const { wrapper } = await mountCard(2)
    const text = wrapper.text()
    expect(text).toContain('Rosyth School')
    expect(text).toContain('RS')
    expect(text).toContain('Government')
    expect(text).toContain('Serangoon · 555855 · Nearest MRT: Serangoon (NE12)')
    expect(text).toContain('P1 Phase 2C ratio')
    expect(text).toContain('2.4 : 1')
    expect(text).toContain('1.4 km')
    expect(wrapper.find('img').attributes('alt')).toBe('Rosyth School badge')
  })

  it.each([
    [5, 'PSLE AL range', 'AL 4 – 6'],
    [9, 'JAE cut-off', 'ELR2B2 ≤ 8'],
    [11, 'JAE cut-off', 'L1R5 ≤ 5'],
    [14, 'IGP GPA (10th–90th)', '3.90 – 4.00'],
  ])('uses the benchmark that fits school %i', async (id, label, value) => {
    const { wrapper } = await mountCard(id)
    expect(wrapper.text()).toContain(label)
    expect(wrapper.text()).toContain(value)
  })

  it('links the card to the school profile', async () => {
    const { wrapper, router } = await mountCard(2)
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/schools/2')
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schools/2')
  })

  it('prompts for a postal code instead of a distance when none is set', async () => {
    const { wrapper } = await mountCard(2, false)
    expect(wrapper.text()).toContain('Add postal code')
    expect(wrapper.text()).not.toContain('1.4 km')
  })

  it('hides the bookmark control from guests and shows it after login', async () => {
    const { wrapper } = await mountCard(2)
    expect(wrapper.find('button').exists()).toBe(false)
    stubAuthApi()
    await signInAs('planner2026')
    await flushPromises()
    expect(wrapper.get('button').text()).toBe('★ Saved')
  })
})
