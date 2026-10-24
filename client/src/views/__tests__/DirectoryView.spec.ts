import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp, signInAs } from '@/test/helpers'
import DirectoryView from '../DirectoryView.vue'

/** The directory with the primary tier loaded and the default postal code located. */
async function mountDirectory() {
  const mounted = await mountWithApp(DirectoryView)
  await flushPromises()
  return mounted
}

const names = (wrapper: VueWrapper) => wrapper.findAll('article a').map((a) => a.text())
const countText = (wrapper: VueWrapper) =>
  wrapper.get('[data-testid="result-count"]').text().replace(/\s+/g, ' ')
const keyword = (wrapper: VueWrapper) => wrapper.get('input[placeholder^="School name"]')
const tierButton = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('[aria-label="Education tier"] button').find((b) => b.text() === label)!
async function chooseTier(wrapper: VueWrapper, label: string) {
  await tierButton(wrapper, label).trigger('click')
  await flushPromises()
}

describe('DirectoryView (UC-1.1)', () => {
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

    it('asks the server for the tier’s schools', async () => {
      const { api } = await mountDirectory()
      expect(api.callsTo('GET /school-api')[0]?.query.get('stage')).toBe('primary')
    })

    it('shows a loading state until the schools arrive', async () => {
      const api = stubApi()
      const release = api.hold('GET /school-api')
      const { wrapper } = await mountWithApp(DirectoryView, { api })
      expect(wrapper.get('[role="status"]').text()).toContain('Loading schools')
      expect(wrapper.findAll('article')).toHaveLength(0)
      release()
      await flushPromises()
      expect(wrapper.findAll('article')).toHaveLength(4)
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('says when the schools cannot be loaded and offers to try again', async () => {
      const api = stubApi()
      api.override('GET /school-api', () => {
        throw new TypeError('Failed to fetch')
      })
      const { wrapper } = await mountWithApp(DirectoryView, { api })
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe(
        'Unable to load the Primary schools at this time. Please try again.',
      )
      api.restore('GET /school-api')
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Try again')!
        .trigger('click')
      await flushPromises()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(names(wrapper)).toHaveLength(4)
    })

    it('uses the singular noun for a single result', async () => {
      const { wrapper } = await mountDirectory()
      await keyword(wrapper).setValue('rosyth')
      expect(countText(wrapper)).toBe('1 school · Primary')
    })
  })

  describe('tier selection', () => {
    it.each([
      ['Secondary', 4, ['Raffles Institution', "Cedar Girls' Secondary School"]],
      ['Post-Secondary', 3, ['Temasek Junior College', 'Raffles Institution']],
    ])('%s shows its own schools', async (label, count, expected) => {
      const { wrapper } = await mountDirectory()
      await chooseTier(wrapper, label)
      expect(names(wrapper)).toHaveLength(count)
      expect(names(wrapper)).toEqual(expect.arrayContaining(expected))
      expect(countText(wrapper)).toBe(`${count} schools · ${label}`)
    })

    it('says so when the dataset has no school in the tier', async () => {
      const { wrapper } = await mountDirectory()
      await chooseTier(wrapper, 'University')
      expect(wrapper.get('h3').text()).toBe('No University schools yet')
      expect(wrapper.findAll('article')).toHaveLength(0)
      expect(wrapper.find('[data-testid="result-count"]').exists()).toBe(false)
    })

    it('only one tier is selected at a time', async () => {
      const { wrapper } = await mountDirectory()
      await chooseTier(wrapper, 'University')
      const pressed = wrapper
        .findAll('[aria-label="Education tier"] button')
        .filter((b) => b.attributes('aria-pressed') === 'true')
      expect(pressed.map((b) => b.text())).toEqual(['University'])
    })

    it('shows the tier’s own benchmark on each card', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.text()).toContain('Places taken (Phase 2B)')
      expect(wrapper.text()).toContain('120 places')
      await chooseTier(wrapper, 'Secondary')
      expect(wrapper.text()).toContain('PSLE T-score cut-off')
      expect(wrapper.text()).toContain('T-score ≥ 260')
    })

    it('does not fetch a tier twice', async () => {
      const { wrapper, api } = await mountDirectory()
      await chooseTier(wrapper, 'Secondary')
      await chooseTier(wrapper, 'Primary')
      await chooseTier(wrapper, 'Secondary')
      expect(api.callsTo('GET /school-api')).toHaveLength(2)
    })
  })

  describe('search and filters', () => {
    it('narrows results by keyword, by name and acronym (REQ-1.1)', async () => {
      const { wrapper } = await mountDirectory()
      await chooseTier(wrapper, 'Post-Secondary')
      await keyword(wrapper).setValue('temasek')
      expect(names(wrapper)).toEqual(['Temasek Junior College'])
      await keyword(wrapper).setValue('ejc')
      expect(names(wrapper)).toEqual(['Eunoia Junior College'])
    })

    it('does not search below two characters and explains why', async () => {
      const { wrapper } = await mountDirectory()
      await keyword(wrapper).setValue('R')
      expect(wrapper.text()).toContain('Enter at least 2 characters to search.')
      expect(names(wrapper)).toHaveLength(4)
    })

    it('filters by school type (REQ-1.3)', async () => {
      const { wrapper } = await mountDirectory()
      await wrapper.get('select').setValue('Government-Aided')
      expect(names(wrapper)).toEqual(['Nanyang Primary School', 'Tao Nan School'])
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
        'Tao Nan School',
        'Nanyang Primary School',
      ])
    })

    it('drops the school type when the tier changes', async () => {
      const { wrapper } = await mountDirectory()
      await wrapper.get('select').setValue('Government-Aided')
      expect(names(wrapper)).toHaveLength(2)
      await chooseTier(wrapper, 'Secondary')
      expect(names(wrapper)).toHaveLength(4)
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
      await wrapper.get('select[aria-label="Distance"]').setValue('1')
      await wrapper.get('select').setValue('Government-Aided')
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
      expect(router.currentRoute.value.fullPath).toBe('/schools/rosyth')
    })
  })

  describe('bookmark control (UC-2.5)', () => {
    async function mountSignedIn() {
      const api = stubApi()
      api.bookmark('planner2026', 2)
      const mounted = await mountWithApp(DirectoryView, { api })
      await signInAs('planner2026')
      await flushPromises()
      return mounted
    }

    it('is absent for guests and present on every card once signed in', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.findAll('article button')).toHaveLength(0)
      const member = await mountSignedIn()
      expect(member.wrapper.findAll('article button').map((b) => b.text())).toEqual([
        '☆ Save',
        '★ Saved',
        '☆ Save',
        '☆ Save',
      ])
    })

    it('bookmarking from a card does not open the school', async () => {
      const { wrapper, router, api } = await mountSignedIn()
      await wrapper.findAll('article button')[0]!.trigger('click')
      await flushPromises()
      expect(wrapper.findAll('article button')[0]!.text()).toBe('★ Saved')
      expect(router.currentRoute.value.fullPath).toBe('/')
      expect(api.bookmarks['planner2026']).toEqual([2, 1])
    })
  })

  describe('distance display', () => {
    it('shows kilometres from the reference postal code, or a prompt without one', async () => {
      const { wrapper } = await mountDirectory()
      expect(wrapper.text()).toMatch(/0\.\d km/)
      expect(wrapper.text()).not.toContain('Add postal code')
      await wrapper.get('input[aria-label="Postal code"]').setValue('12')
      expect(wrapper.text()).not.toMatch(/0\.\d km/)
      expect(wrapper.text()).toContain('Add postal code')
    })

    it('measures from a different postal code once it is located', async () => {
      const { wrapper } = await mountDirectory()
      await wrapper.get('input[aria-label="Postal code"]').setValue('600000')
      await flushPromises()
      expect(wrapper.text()).not.toMatch(/0\.\d km/)
      expect(wrapper.text()).toMatch(/\d{2}\.\d km/)
    })
  })
})
