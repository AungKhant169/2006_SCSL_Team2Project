import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useDirectoryStore } from '@/stores/directory'
import { mountWithApp, signInAs, stubAuthApi } from '@/test/helpers'
import SchoolFilterBar from '../SchoolFilterBar.vue'

describe('SchoolFilterBar (REQ-1.1 to REQ-1.5, REQ-1.15)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('typing a keyword drives the directory search', async () => {
    const { wrapper } = await mountWithApp(SchoolFilterBar)
    await wrapper.get('input[placeholder^="Name, acronym"]').setValue('nus')
    expect(useDirectoryStore().query).toBe('nus')
  })

  describe('keyword validation', () => {
    it('shows no error for a valid or empty keyword', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      await wrapper.get('input[placeholder^="Name, acronym"]').setValue('ri')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('asks for at least two characters', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const input = wrapper.get('input[placeholder^="Name, acronym"]')
      await input.setValue('N')
      expect(wrapper.get('[role="alert"]').text()).toBe('Enter at least 2 characters to search.')
      expect(input.classes()).toContain('field-control-invalid')
    })

    it('reports stripped symbols', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      await wrapper.get('input[placeholder^="Name, acronym"]').setValue('<script>')
      expect(wrapper.get('[role="alert"]').text()).toMatch(/Unsupported characters were removed/)
    })

    it('links the error to the field for assistive technology', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const input = wrapper.get('input[placeholder^="Name, acronym"]')
      await input.setValue('N')
      expect(input.attributes('aria-describedby')).toBe(
        wrapper.get('[role="alert"]').attributes('id'),
      )
    })
  })

  describe('filters', () => {
    it('governance offers All, Public/Government and Private', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const select = wrapper.get('select')
      expect(select.findAll('option').map((o) => o.text())).toEqual([
        'All',
        'Public/Government',
        'Private',
      ])
      await select.setValue('Private')
      expect(useDirectoryStore().gov).toBe('Private')
    })

    it('shows the field-of-study filter for tertiary tiers only', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const directory = useDirectoryStore()
      const hasField = () => wrapper.text().includes('Field of study')
      expect(hasField()).toBe(false)
      directory.tier = 'postsec'
      await flushPromises()
      expect(hasField()).toBe(true)
      directory.tier = 'uni'
      await flushPromises()
      expect(hasField()).toBe(true)
      directory.tier = 'secondary'
      await flushPromises()
      expect(hasField()).toBe(false)
    })

    it('field filter offers the four fields', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      useDirectoryStore().tier = 'uni'
      await flushPromises()
      const select = wrapper.findAll('select')[1]!
      expect(select.findAll('option').map((o) => o.text())).toEqual([
        'All fields',
        'STEM',
        'Business',
        'Healthcare',
        'Arts & Humanities',
      ])
      await select.setValue('Healthcare')
      expect(useDirectoryStore().field).toBe('Healthcare')
    })

    it('distance offers radius options', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const select = wrapper.get('select[aria-label="Distance"]')
      expect(select.findAll('option').map((o) => o.text())).toEqual([
        'Any distance',
        'Within 1 km',
        'Within 2 km',
        'Within 5 km',
      ])
      await select.setValue('2')
      expect(useDirectoryStore().distance).toBe('2')
    })
  })

  describe('reference postal code (REQ-1.5, BR-4)', () => {
    const postalInput = (w: Awaited<ReturnType<typeof mountWithApp>>['wrapper']) =>
      w.get<HTMLInputElement>('input[aria-label="Postal code"]')

    it('starts from the default and accepts digits only, up to six', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      const input = postalInput(wrapper)
      expect(input.element.value).toBe('556000')
      expect(input.attributes('maxlength')).toBe('6')
      expect(input.attributes('inputmode')).toBe('numeric')
      await input.setValue('11a9-077x7')
      expect(useDirectoryStore().postal).toBe('119077')
    })

    it('explains how the code is used, for guests and signed-in users', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      expect(wrapper.text()).toContain('Reference postal code for distances.')
      expect(wrapper.text()).toContain('to use your saved residential postal code automatically')
      expect(wrapper.get('a[href="/login"]').text()).toBe('Log in')

      stubAuthApi()
      await signInAs('planner2026')
      await flushPromises()
      expect(wrapper.text()).toContain('Using your saved residential postal code.')
      expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
    })

    it('warns when the code is incomplete', async () => {
      const { wrapper } = await mountWithApp(SchoolFilterBar)
      await postalInput(wrapper).setValue('123')
      expect(wrapper.text()).toContain('Please enter a valid 6-digit Singapore postal code.')
    })
  })

  it('Reset all restores every filter in one click (REQ-1.15)', async () => {
    const { wrapper } = await mountWithApp(SchoolFilterBar)
    const directory = useDirectoryStore()
    directory.query = 'ro'
    directory.gov = 'Private'
    directory.distance = '1'
    directory.sort = 'za'
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Reset all')!
    await reset.trigger('click')
    expect([directory.query, directory.gov, directory.distance, directory.sort]).toEqual([
      '',
      'All',
      'any',
      'az',
    ])
  })
})
