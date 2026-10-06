import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { useDirectoryStore } from '@/stores/directory'
import { useProfileStore } from '@/stores/profile'
import { mountWithApp } from '@/test/helpers'
import ProfileView from '../ProfileView.vue'

const mountProfile = () =>
  mountWithApp(ProfileView, { route: '/profile', signedInAs: 'planner2026' })
const save = (w: VueWrapper) =>
  w
    .findAll('button')
    .find((b) => b.text() === 'Save profile')!
    .trigger('click')
const postal = (w: VueWrapper) =>
  w.get<HTMLInputElement>('input[aria-label="Residential postal code"]')
const level = (w: VueWrapper, label: string) =>
  w.findAll('button').find((b) => b.text().includes(label))!
const alertText = (w: VueWrapper) => w.find('[role="alert"]').text()

describe('ProfileView (UC-2.4)', () => {
  afterEach(() => vi.unstubAllGlobals())

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
    it('stores a valid profile and confirms it', async () => {
      const { wrapper } = await mountProfile()
      await save(wrapper)
      expect(wrapper.get('[role="status"]').text()).toBe('Profile saved')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('makes the postal code the default for every distance calculation (REQ-2.11)', async () => {
      const { wrapper } = await mountProfile()
      await postal(wrapper).setValue('119077')
      await save(wrapper)
      expect(useDirectoryStore().postal).toBe('119077')
    })

    it('blocks an out-of-range PSLE score with an inline message (REQ-2.8)', async () => {
      const { wrapper } = await mountProfile()
      await wrapper.get('input[placeholder="4 – 32"]').setValue('35')
      await save(wrapper)
      expect(alertText(wrapper)).toBe(
        'Invalid academic score! PSLE AL must be a whole number from 4 to 32.',
      )
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
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

    it('drops the confirmation once the form is edited again', async () => {
      const { wrapper } = await mountProfile()
      await save(wrapper)
      expect(wrapper.find('[role="status"]').exists()).toBe(true)
      await wrapper.get('input[placeholder="4 – 32"]').setValue('9')
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('does not need any academic result for preschool or P1', async () => {
      const { wrapper } = await mountProfile()
      await level(wrapper, 'P1 Registration').trigger('click')
      await save(wrapper)
      expect(wrapper.get('[role="status"]').text()).toBe('Profile saved')
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
