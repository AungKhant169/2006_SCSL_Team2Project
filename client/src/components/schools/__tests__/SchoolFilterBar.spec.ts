import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useDirectoryStore } from '@/stores/directory'
import { mountWithApp, signInAs } from '@/test/helpers'
import SchoolFilterBar from '../SchoolFilterBar.vue'

const KEYWORD = 'input[placeholder^="School name"]'

/** The filter bar with the primary tier loaded and the default postal code located. */
async function mountBar() {
  const mounted = await mountWithApp(SchoolFilterBar)
  await useDirectoryStore().load()
  await flushPromises()
  return mounted
}

describe('SchoolFilterBar (REQ-1.1 to REQ-1.5, REQ-1.15)', () => {
  it('typing a keyword drives the directory search', async () => {
    const { wrapper } = await mountBar()
    await wrapper.get(KEYWORD).setValue('nus')
    expect(useDirectoryStore().query).toBe('nus')
  })

  describe('keyword validation', () => {
    it('shows no error for a valid or empty keyword', async () => {
      const { wrapper } = await mountBar()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      await wrapper.get(KEYWORD).setValue('ri')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('asks for at least two characters', async () => {
      const { wrapper } = await mountBar()
      const input = wrapper.get(KEYWORD)
      await input.setValue('N')
      expect(wrapper.get('[role="alert"]').text()).toBe('Enter at least 2 characters to search.')
      expect(input.classes()).toContain('field-control-invalid')
    })

    it('reports stripped symbols', async () => {
      const { wrapper } = await mountBar()
      await wrapper.get(KEYWORD).setValue('<script>')
      expect(wrapper.get('[role="alert"]').text()).toMatch(/Unsupported characters were removed/)
    })

    it('links the error to the field for assistive technology', async () => {
      const { wrapper } = await mountBar()
      const input = wrapper.get(KEYWORD)
      await input.setValue('N')
      expect(input.attributes('aria-describedby')).toBe(
        wrapper.get('[role="alert"]').attributes('id'),
      )
    })
  })

  describe('filters', () => {
    it('school type offers the types the tier has, after All', async () => {
      const { wrapper } = await mountBar()
      const select = wrapper.get('select')
      expect(select.findAll('option').map((o) => o.text())).toEqual([
        'All types',
        'Government',
        'Government-Aided',
      ])
      await select.setValue('Government-Aided')
      expect(useDirectoryStore().schoolType).toBe('Government-Aided')
    })

    it('school type follows the tier', async () => {
      const { wrapper } = await mountBar()
      const directory = useDirectoryStore()
      directory.tier = 'secondary'
      await flushPromises()
      expect(
        wrapper
          .get('select')
          .findAll('option')
          .map((o) => o.text()),
      ).toEqual(['All types', 'Government', 'Government-Aided', 'Independent'])
    })

    it('has no field-of-study filter: the dataset has no fields', async () => {
      const { wrapper } = await mountBar()
      useDirectoryStore().tier = 'postsec'
      await flushPromises()
      expect(wrapper.text()).not.toContain('Field of study')
    })

    it('distance offers radius options', async () => {
      const { wrapper } = await mountBar()
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
      const { wrapper } = await mountBar()
      const input = postalInput(wrapper)
      expect(input.element.value).toBe('556000')
      expect(input.attributes('maxlength')).toBe('6')
      expect(input.attributes('inputmode')).toBe('numeric')
      await input.setValue('11a9-077x7')
      expect(useDirectoryStore().postal).toBe('119077')
    })

    it('explains how the code is used, for guests and signed-in users', async () => {
      const { wrapper } = await mountBar()
      expect(wrapper.text()).toContain('Reference postal code for distances.')
      expect(wrapper.text()).toContain('to use your saved residential postal code automatically')
      expect(wrapper.get('a[href="/login"]').text()).toBe('Log in')

      await signInAs('planner2026')
      await flushPromises()
      expect(wrapper.text()).toContain('Using your saved residential postal code.')
      expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
    })

    it('warns when the code is incomplete', async () => {
      const { wrapper } = await mountBar()
      await postalInput(wrapper).setValue('123')
      expect(wrapper.text()).toContain('Please enter a valid 6-digit Singapore postal code.')
    })

    it('warns when the server cannot place a complete code', async () => {
      const { wrapper } = await mountBar()
      await postalInput(wrapper).setValue('990000')
      await flushPromises()
      expect(wrapper.text()).toContain('This postal code could not be located.')
    })
  })

  it('Reset all restores every filter in one click (REQ-1.15)', async () => {
    const { wrapper } = await mountBar()
    const directory = useDirectoryStore()
    directory.query = 'ro'
    directory.schoolType = 'Government'
    directory.distance = '1'
    directory.sort = 'za'
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Reset all')!
    await reset.trigger('click')
    expect([directory.query, directory.schoolType, directory.distance, directory.sort]).toEqual([
      '',
      '',
      'any',
      'az',
    ])
  })
})
