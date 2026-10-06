import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { mountWithApp } from '@/test/helpers'
import AcademicResultsCard from '../AcademicResultsCard.vue'
import PostalCodeCard from '../PostalCodeCard.vue'
import TargetLevelCard from '../TargetLevelCard.vue'

describe('PostalCodeCard (REQ-2.10, BR-4)', () => {
  const mountCard = () => {
    setActivePinia(createPinia())
    return mount(PostalCodeCard)
  }
  const input = (w: ReturnType<typeof mountCard>) =>
    w.get<HTMLInputElement>('input[aria-label="Residential postal code"]')

  it('explains that it anchors every distance and is required for roadmaps', () => {
    const wrapper = mountCard()
    expect(wrapper.get('h2').text()).toBe('Residential postal code *')
    expect(wrapper.text()).toContain(
      'Default reference point for all distance calculations, and required before generating a roadmap.',
    )
  })

  it('accepts digits only and at most six', async () => {
    const wrapper = mountCard()
    expect(input(wrapper).attributes('maxlength')).toBe('6')
    expect(input(wrapper).attributes('inputmode')).toBe('numeric')
    await input(wrapper).setValue('12ab34-5678')
    expect(useProfileStore().postal).toBe('123456')
  })

  it('confirms a valid code and flags a missing or incomplete one', async () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Valid Singapore postal code')
    await input(wrapper).setValue('1234')
    expect(wrapper.text()).toContain('Required · 6 digits')
    expect(wrapper.text()).not.toContain('Valid Singapore postal code')
  })
})

describe('TargetLevelCard (REQ-2.6)', () => {
  it('offers the five stages and marks the profile’s current target', () => {
    setActivePinia(createPinia())
    const wrapper = mount(TargetLevelCard)
    expect(wrapper.get('h2').text()).toBe('Target education level *')
    expect(wrapper.findAll('button')).toHaveLength(5)
    const active = wrapper.findAll('button[aria-pressed="true"]')
    expect(active).toHaveLength(1)
    expect(active[0]!.text()).toContain('S1 Posting')
  })

  it('choosing a stage updates the profile and clears the old scores', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(TargetLevelCard)
    const profile = useProfileStore()
    expect(profile.scoreA).toBe('8')
    await wrapper.findAll('button')[4]!.trigger('click')
    expect(profile.level).toBe('uni')
    expect(profile.scoreA).toBe('')
  })
})

describe('AcademicResultsCard (REQ-2.7, PERF-2)', () => {
  async function mountFor(level: Parameters<ReturnType<typeof useProfileStore>['setLevel']>[0]) {
    const mounted = await mountWithApp(AcademicResultsCard)
    useProfileStore().setLevel(level)
    await mounted.wrapper.vm.$nextTick()
    return mounted.wrapper
  }
  const labels = (w: Awaited<ReturnType<typeof mountFor>>) =>
    w.findAll('label').map((l) => l.text())

  it('preschool collects no results', async () => {
    const wrapper = await mountFor('preschool')
    expect(wrapper.text()).toContain('No academic results are collected for preschool placement.')
    expect(wrapper.findAll('input')).toHaveLength(0)
  })

  it('primary offers "None" or "Kindergarten completion"', async () => {
    const wrapper = await mountFor('primary')
    const chips = wrapper.findAll('button')
    expect(chips.map((c) => c.text())).toEqual(['None', 'Kindergarten completion'])
    expect(chips[0]!.attributes('aria-pressed')).toBe('true')
    await chips[1]!.trigger('click')
    expect(useProfileStore().primaryResult).toBe('Kindergarten completion')
    expect(chips[1]!.attributes('aria-pressed')).toBe('true')
    expect(chips[0]!.attributes('aria-pressed')).toBe('false')
    expect(wrapper.text()).toContain('No prior results are required for P1 Registration.')
  })

  it('secondary asks for the PSLE AL aggregate only', async () => {
    const wrapper = await mountFor('secondary')
    expect(labels(wrapper)).toEqual(['PSLE Aggregate AL score'])
    expect(wrapper.text()).toContain('Integer between 4 (best) and 32.')
    expect(wrapper.get('input').attributes('placeholder')).toBe('4 – 32')
  })

  it('post-secondary asks for L1R5 and ELR2B2', async () => {
    const wrapper = await mountFor('postsec')
    expect(labels(wrapper)).toEqual(['O-Level L1R5 (net)', 'O-Level ELR2B2'])
    expect(wrapper.text()).toContain('For Junior College admission.')
    expect(wrapper.text()).toContain('For Polytechnic / ITE admission.')
    expect(wrapper.findAll('input').map((i) => i.attributes('inputmode'))).toEqual([
      'numeric',
      'numeric',
    ])
  })

  it('university asks for polytechnic GPA and A-Level rank points', async () => {
    const wrapper = await mountFor('uni')
    expect(labels(wrapper)).toEqual(['Polytechnic cumulative GPA', 'A-Level rank points'])
    expect(wrapper.findAll('input').map((i) => i.attributes('inputmode'))).toEqual([
      'decimal',
      'decimal',
    ])
  })

  it('typing updates the profile scores', async () => {
    const wrapper = await mountFor('postsec')
    const [l1r5, elr2b2] = wrapper.findAll('input')
    await l1r5!.setValue('14')
    await elr2b2!.setValue('9')
    const profile = useProfileStore()
    expect([profile.scoreA, profile.scoreB]).toEqual(['14', '9'])
  })

  it('shows the profile’s validation error inline', async () => {
    const wrapper = await mountFor('secondary')
    const profile = useProfileStore()
    profile.scoreA = '35'
    profile.save()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Invalid academic score! PSLE AL must be a whole number from 4 to 32.',
    )
  })

  it('swaps fields immediately when the level changes', async () => {
    const wrapper = await mountFor('secondary')
    useProfileStore().setLevel('uni')
    await wrapper.vm.$nextTick()
    expect(labels(wrapper)).toEqual(['Polytechnic cumulative GPA', 'A-Level rank points'])
  })
})
