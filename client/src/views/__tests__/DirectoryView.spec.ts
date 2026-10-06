import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountWithApp, signInAs, stubAuthApi } from '@/test/helpers'
import DirectoryView from '../DirectoryView.vue'

const mountDirectory = () => mountWithApp(DirectoryView)

const names = (wrapper: VueWrapper) => wrapper.findAll('article a').map((a) => a.text())
const countText = (wrapper: VueWrapper) =>
  wrapper.get('[data-testid="result-count"]').text().replace(/\s+/g, ' ')
const keyword = (wrapper: VueWrapper) => wrapper.get('input[placeholder^="Name, acronym"]')
const tierButton = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('[aria-label="Education tier"] button').find((b) => b.text() === label)!

describe('DirectoryView (UC-1.1)', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('landing view', () => {
    it('shows the directory heading and a four-way tier switch (REQ-1.2)', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.get('h1').text()).toBe('School Directory')
      const tiers = wrapper.findAll('[aria-label="Education tier"] button')
      expect(tiers.map((b) => b.text())).toEqual([
        'Primary',
        'Secondary',
        'Post-Secondary',
        'University',
      ])
      expect(tiers.map((b) => b.attributes('aria-pressed'))).toEqual([
        'true',
        'false',
        'false',
        'false',
      ])
    })

    it('lists the primary schools A–Z with a result count', async () => {
      const { wrapper } = await mountDirectory()
      expect(names(wrapper)).toEqual([
        'Nanyang Primary School',
        'Rosyth School',
        'Tao Nan School',
        'Zhonghua Primary School',
      ])
      expect(countText(wrapper)).toBe('4 schools · Primary')
      expect(wrapper.text()).toContain('Page 1 of 1 · 10 per page')
    })

    it('uses the singular noun for a single result', async () => {
      const { wrapper } = await mountDirectory()
      await keyword(wrapper).setValue('rosyth')
      expect(countText(wrapper)).toBe('1 school · Primary')
    })
  })

  describe('tier selection', () => {
    it.each([
      ['Secondary', 4, ['Bukit Panjang Government High School']],
      ['Post-Secondary', 5, ['Eastbridge Academy (Private)']],
      ['University', 4, ['National University of Singapore']],
    ])('%s shows its own schools', async (label, count, expected) => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, label).trigger('click')
      expect(names(wrapper)).toHaveLength(count)
      expect(names(wrapper)).toEqual(expect.arrayContaining(expected))
      expect(countText(wrapper)).toBe(`${count} schools · ${label}`)
    })

    it('only one tier is selected at a time', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'University').trigger('click')
      const pressed = wrapper
        .findAll('[aria-label="Education tier"] button')
        .filter((b) => b.attributes('aria-pressed') === 'true')
      expect(pressed.map((b) => b.text())).toEqual(['University'])
    })

    it('shows the tier’s own benchmark on each card', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.text()).toContain('P1 Phase 2C ratio')
      await tierButton(wrapper, 'Secondary').trigger('click')
      expect(wrapper.text()).toContain('PSLE AL range')
    })
  })

  describe('search and filters', () => {
    it('narrows results by keyword, by name, acronym and course (REQ-1.1)', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'University').trigger('click')
      await keyword(wrapper).setValue('nanyang')
      expect(names(wrapper)).toEqual(['Nanyang Technological University'])
      await keyword(wrapper).setValue('smu')
      expect(names(wrapper)).toEqual(['Singapore Management University'])
      await keyword(wrapper).setValue('sociology')
      expect(names(wrapper)).toEqual(['National University of Singapore'])
    })

    it('does not search below two characters and explains why', async () => {
      const { wrapper } = await mountDirectory()
      await keyword(wrapper).setValue('R')
      expect(wrapper.text()).toContain('Enter at least 2 characters to search.')
      expect(names(wrapper)).toHaveLength(4)
    })

    it('filters by governance (REQ-1.3)', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'Post-Secondary').trigger('click')
      await wrapper.get('select').setValue('Private')
      expect(names(wrapper)).toEqual(['Eastbridge Academy (Private)'])
    })

    it('filters tertiary institutions by field of study (REQ-1.4)', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'Post-Secondary').trigger('click')
      await wrapper.findAll('select')[1]!.setValue('Healthcare')
      expect(names(wrapper)).toEqual(['Ngee Ann Polytechnic', 'Singapore Polytechnic'])
    })

    it('filters by distance from the postal code (REQ-1.5)', async () => {
      const { wrapper } = await mountDirectory()
      await wrapper.get('select[aria-label="Distance"]').setValue('2')
      expect(names(wrapper)).toEqual(['Rosyth School', 'Zhonghua Primary School'])
    })

    it('sorts Z–A and nearest first (REQ-1.6)', async () => {
      const { wrapper } = await mountDirectory()
      const sort = wrapper.get('label select')
      await sort.setValue('za')
      expect(names(wrapper)[0]).toBe('Zhonghua Primary School')
      await sort.setValue('dist')
      expect(names(wrapper)).toEqual([
        'Zhonghua Primary School',
        'Rosyth School',
        'Nanyang Primary School',
        'Tao Nan School',
      ])
    })

    it('drops the field filter when the tier changes', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'University').trigger('click')
      await wrapper.findAll('select')[1]!.setValue('Healthcare')
      expect(names(wrapper)).toHaveLength(1)
      await tierButton(wrapper, 'Post-Secondary').trigger('click')
      expect(names(wrapper)).toHaveLength(5)
    })
  })

  describe('zero results (REQ-1.14, REQ-1.15)', () => {
    async function mountEmpty() {
      const mounted = await mountDirectory()
      await keyword(mounted.wrapper).setValue('zzzz')
      return mounted
    }

    it('replaces the list with the "No Schools Found" state and its prescribed message', async () => {
      const { wrapper } = await mountEmpty()
      expect(wrapper.get('h3').text()).toBe('No Schools Found')
      expect(wrapper.text()).toContain(
        'No schools match your search criteria. Try clearing filters or adjusting your search keywords.',
      )
      expect(wrapper.findAll('article')).toHaveLength(0)
      expect(wrapper.text()).not.toContain('Page 1 of')
      expect(countText(wrapper)).toBe('0 schools · Primary')
    })

    it('suggests how to broaden the search', async () => {
      const { wrapper } = await mountEmpty()
      const suggestions = wrapper.findAll('ul li').map((li) => li.text())
      expect(suggestions).toEqual(['Widen distance', 'Check spelling', 'Try another tier'])
    })

    it('Reset All Filters brings back the whole list in one click', async () => {
      const { wrapper } = await mountEmpty()
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Reset All Filters')!
        .trigger('click')
      expect(names(wrapper)).toHaveLength(4)
      expect((keyword(wrapper).element as HTMLInputElement).value).toBe('')
      expect(wrapper.text()).not.toContain('No Schools Found')
    })

    it('treats symbol input as a safe sanitised search instead of failing (SEC-4)', async () => {
      const { wrapper } = await mountDirectory()
      await keyword(wrapper).setValue('<script>')
      expect(wrapper.text()).toContain('Unsupported characters were removed')
      expect(wrapper.get('h3').text()).toBe('No Schools Found')
    })

    it('can be caused by a filter combination as well as a keyword', async () => {
      const { wrapper } = await mountDirectory()
      await tierButton(wrapper, 'University').trigger('click')
      await wrapper.get('select[aria-label="Distance"]').setValue('1')
      expect(wrapper.get('h3').text()).toBe('No Schools Found')
    })
  })

  describe('opening a school (UC-1.2)', () => {
    it('clicking a card opens that school’s profile', async () => {
      const { wrapper, router } = await mountDirectory()
      await wrapper
        .findAll('article a')
        .find((a) => a.text() === 'Rosyth School')!
        .trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/schools/2')
    })
  })

  describe('bookmark control (UC-2.5)', () => {
    it('is absent for guests and present on every card once signed in', async () => {
      const { wrapper } = await mountDirectory()
      const bookmarkButtons = () => wrapper.findAll('article button')
      expect(bookmarkButtons()).toHaveLength(0)
      stubAuthApi()
      await signInAs('planner2026')
      await flushPromises()
      expect(bookmarkButtons().map((b) => b.text())).toEqual([
        '☆ Save',
        '★ Saved',
        '☆ Save',
        '☆ Save',
      ])
    })

    it('bookmarking from a card does not open the school', async () => {
      const { wrapper, router } = await mountDirectory()
      stubAuthApi()
      await signInAs('planner2026')
      await flushPromises()
      await wrapper.findAll('article button')[0]!.trigger('click')
      expect(wrapper.findAll('article button')[0]!.text()).toBe('★ Saved')
      expect(router.currentRoute.value.fullPath).toBe('/')
    })
  })

  describe('distance display', () => {
    it('shows kilometres from the reference postal code, or a prompt without one', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.text()).toContain('0.8 km')
      await wrapper.get('input[aria-label="Postal code"]').setValue('12')
      expect(wrapper.text()).not.toContain('0.8 km')
      expect(wrapper.text()).toContain('Add postal code')
    })
  })
})
