import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useDirectoryStore } from '@/stores/directory'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import ProfileView from '../ProfileView.vue'

/** The profile page of a student whose stored profile targets S1 posting with an AL score of 8. */
const mountProfile = () => {
  const api = stubApi()
  api.profiles['planner2026'] = {
    level: 'secondary',
    score_a: 8,
    score_b: null,
    postal: '556000',
    primary_result: 'None',
  }
  return mountWithApp(ProfileView, { route: '/profile', signedInAs: 'planner2026', api })
}
const save = async (w: VueWrapper) => {
  await w
    .findAll('button')
    .find((b) => b.text() === 'Save profile')!
    .trigger('click')
  await flushPromises()
}
const postal = (w: VueWrapper) =>
  w.get<HTMLInputElement>('input[aria-label="Residential postal code"]')
const level = (w: VueWrapper, label: string) =>
  w.findAll('button').find((b) => b.text().includes(label))!
const alertText = (w: VueWrapper) => w.find('[role="alert"]').text()

describe('ProfileView (UC-2.4)', () => {
  it('shows the three profile sections in order', async () => {
    const { wrapper } = await mountProfile()
    expect(wrapper.get('h1').text()).toBe('My profile')
    expect(wrapper.text()).toContain('No personal identifiers are stored.')
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
      'Residential postal code *',
      'Target education level *',
      'Previous academic results',
    ])
  })

  describe('saving', () => {
    it('stores a valid profile, opens the roadmap and confirms it with a toast', async () => {
      const { wrapper, router, api } = await mountProfile()
      await wrapper.get('input[placeholder="4 – 32"]').setValue('12')
      await save(wrapper)
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(useUiStore().toast).toBe('Profile saved successfully')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(api.profiles['planner2026']).toMatchObject({ level: 'secondary', score_a: 12 })
    })

    it('shows the stored profile when the page opens', async () => {
      const { wrapper } = await mountProfile()
      expect(wrapper.get<HTMLInputElement>('input[placeholder="4 – 32"]').element.value).toBe('8')
      expect(postal(wrapper).element.value).toBe('556000')
    })

    it('makes the postal code the default for every distance calculation (REQ-2.11)', async () => {
      const { wrapper } = await mountProfile()
      await postal(wrapper).setValue('119077')
      await save(wrapper)
      expect(useDirectoryStore().postal).toBe('119077')
    })

    it('blocks an out-of-range PSLE score with an inline message (REQ-2.8)', async () => {
      const { wrapper, router } = await mountProfile()
      await wrapper.get('input[placeholder="4 – 32"]').setValue('35')
      await save(wrapper)
      expect(alertText(wrapper)).toBe(
        'Invalid academic score! PSLE AL must be a whole number from 4 to 32.',
      )
      expect(router.currentRoute.value.name).toBe('profile')
      expect(useUiStore().toast).toBe('')
    })

    it('blocks an incomplete postal code (REQ-2.16)', async () => {
      const { wrapper } = await mountProfile()
      await postal(wrapper).setValue('12345')
      await save(wrapper)
      expect(alertText(wrapper)).toBe('Please enter a valid 6-digit Singapore postal code.')
      expect(useDirectoryStore().postal).toBe('556000')
    })

    it('blocks a polytechnic GPA above 4.00', async () => {
      const { wrapper } = await mountProfile()
      await level(wrapper, 'Autonomous University').trigger('click')
      await wrapper.get('input[placeholder="0.00 – 4.00"]').setValue('4.5')
      await save(wrapper)
      expect(alertText(wrapper)).toBe('Invalid academic score! GPA must be between 0.00 and 4.00.')
    })

    it('needs at least one result for post-secondary targets', async () => {
      const { wrapper } = await mountProfile()
      await level(wrapper, 'JC / Polytechnic / ITE').trigger('click')
      await save(wrapper)
      expect(alertText(wrapper)).toBe('Invalid academic score! Enter an L1R5 or ELR2B2 aggregate.')
    })

    it('stays on the page without a toast when the server refuses the profile', async () => {
      const { wrapper, router, api } = await mountProfile()
      api.override('PUT /profile', () =>
        Response.json({ detail: 'The profile could not be stored.' }, { status: 500 }),
      )
      await save(wrapper)
      expect(alertText(wrapper)).toBe('The profile could not be stored.')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(useUiStore().toast).toBe('')
    })

    it('does not need any academic result for preschool or P1', async () => {
      const { wrapper, router } = await mountProfile()
      await level(wrapper, 'P1 Registration').trigger('click')
      await save(wrapper)
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(useUiStore().toast).toBe('Profile saved successfully')
    })
  })

  describe('target level', () => {
    it('re-renders only the fields relevant to the chosen transition (REQ-2.7)', async () => {
      const { wrapper } = await mountProfile()
      const fieldLabels = () => wrapper.findAll('label').map((l) => l.text())
      expect(fieldLabels()).toEqual(['PSLE Aggregate AL score'])
      await level(wrapper, 'JC / Polytechnic / ITE').trigger('click')
      expect(fieldLabels()).toEqual(['O-Level L1R5 (net)', 'O-Level ELR2B2'])
      await level(wrapper, 'Autonomous University').trigger('click')
      expect(fieldLabels()).toEqual(['Polytechnic cumulative GPA', 'A-Level rank points'])
      await level(wrapper, 'Preschool placement').trigger('click')
      expect(fieldLabels()).toEqual([])
    })

    it('clears the previous scores when switching', async () => {
      const { wrapper } = await mountProfile()
      await level(wrapper, 'JC / Polytechnic / ITE').trigger('click')
      expect(wrapper.get<HTMLInputElement>('input[placeholder="2 – 54"]').element.value).toBe('')
      expect(useProfileStore().scoreA).toBe('')
    })

    it('pre-selects the roadmap stage from the target level', async () => {
      const { wrapper } = await mountProfile()
      await level(wrapper, 'JC / Polytechnic / ITE').trigger('click')
      const { useRoadmapStore } = await import('@/stores/roadmap')
      expect(useRoadmapStore().stage).toBe('postsec')
    })
  })
})
