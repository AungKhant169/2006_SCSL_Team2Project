import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { routes } from '@/router'
import { generateAiPlan } from '@/services/roadmapAiService'
import { mountWithApp, stubAuthApi } from '@/test/helpers'
import App from '../App.vue'

vi.mock('@/services/roadmapAiService', () => ({ generateAiPlan: vi.fn() }))

/*
 * End-to-end journeys through the whole shell: real routes (lazy views), header, banner,
 * dialogs and stores, driven only through what a user can click and type.
 */

let mounted: VueWrapper | undefined

async function settle() {
  await vi.dynamicImportSettled()
  await flushPromises()
}

async function launch(route = '/') {
  stubAuthApi()
  const app = await mountWithApp(App, { routes, route, attachTo: document.body })
  mounted = app.wrapper as VueWrapper
  await settle()
  return app
}

const body = () => document.body
const text = () => body().textContent!.replace(/\s+/g, ' ')
const dialog = () => document.body.querySelector('[role="dialog"]')

function find<T extends Element>(selector: string, label?: string): T {
  const candidates = Array.from(document.body.querySelectorAll<T>(selector))
  const match = label ? candidates.find((el) => el.textContent!.trim() === label) : candidates[0]
  if (!match) throw new Error(`No ${selector}${label ? ` "${label}"` : ''} on the page`)
  return match
}

async function click(selector: string, label?: string) {
  find<HTMLElement>(selector, label).click()
  await settle()
}

async function type(selector: string, value: string) {
  const input = find<HTMLInputElement | HTMLTextAreaElement>(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function submitForm() {
  find<HTMLFormElement>('form').dispatchEvent(
    new Event('submit', { cancelable: true, bubbles: true }),
  )
  await settle()
}

async function logIn(username: string) {
  await click('nav a', 'Log in')
  await type('input[autocomplete="username"]', username)
  await type('input[type="password"]', 'abcd123!')
  await submitForm()
}

const navLabels = () =>
  Array.from(document.body.querySelectorAll('header nav > *')).map((el) =>
    el.textContent!.replace(/\s+/g, ' ').trim(),
  )

describe('PathSG app journeys', () => {
  beforeEach(() => {
    vi.mocked(generateAiPlan).mockReset()
    vi.mocked(generateAiPlan).mockResolvedValue([5, 6, 7, 8])
  })
  afterEach(() => {
    mounted?.unmount()
    mounted = undefined
    vi.unstubAllGlobals()
  })

  it('opens on the school directory', async () => {
    const { router } = await launch()
    expect(router.currentRoute.value.name).toBe('directory')
    expect(text()).toContain('School Directory')
    expect(navLabels()).toEqual(['Directory', 'Roadmap', 'Log in'])
  })

  describe('guest', () => {
    it('searches, opens a school and reads its profile and reviews', async () => {
      const { router } = await launch()
      await type('input[placeholder^="Name, acronym"]', 'rosyth')
      expect(text()).toContain('1 school · Primary')
      await click('article a', 'Rosyth School')
      expect(router.currentRoute.value.fullPath).toBe('/schools/2')
      expect(find('h1').textContent).toBe('Rosyth School')
      expect(text()).toContain('Reviews (2)')
      expect(text()).toContain('eastsideparent')
      // Guests get no bookmark control on the profile.
      expect(text()).not.toContain('☆ Save')
    })

    it('goes back to the directory with the search intact', async () => {
      await launch()
      await type('input[placeholder^="Name, acronym"]', 'rosyth')
      await click('article a', 'Rosyth School')
      await click('a', '← Back to directory')
      expect(find<HTMLInputElement>('input[placeholder^="Name, acronym"]').value).toBe('rosyth')
      expect(text()).toContain('1 school · Primary')
    })

    it('is sent to log in from protected pages, with the reason shown', async () => {
      const { router } = await launch()
      await click('nav a', 'Roadmap')
      expect(router.currentRoute.value.name).toBe('login')
      expect(find('[role="status"]').textContent).toContain(
        'Log in to generate and save an education roadmap.',
      )
    })

    it('Write a review asks them to log in, then leads to the login page', async () => {
      const { router } = await launch('/schools/2')
      await click('button', 'Write a review')
      expect(dialog()!.textContent).toContain(
        'Please log in or create an account to post a review.',
      )
      await click('[role="dialog"] button', 'Log in')
      expect(router.currentRoute.value.name).toBe('login')
      expect(find('[role="status"]').textContent).toContain(
        'Log in or create an account to post a review.',
      )
      expect(dialog()).toBeNull()
    })
  })

  describe('signing in', () => {
    it('lands a student on their profile with the account menu', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(navLabels()).toEqual([
        'Directory',
        'Roadmap',
        'Saved 2',
        'My profile',
        'planner2026 · Log out',
      ])
    })

    it('lands the admin on the admin panel, where the Admin panel entry appears', async () => {
      const { router } = await launch()
      await logIn('admin')
      expect(router.currentRoute.value.name).toBe('admin')
      expect(navLabels()).toContain('Admin panel')
      expect(find('h1').textContent).toBe('Admin panel')
    })

    it('logging out returns to the directory and locks protected pages again', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      await click('header button', 'planner2026 · Log out')
      expect(router.currentRoute.value.name).toBe('directory')
      expect(navLabels()).toEqual(['Directory', 'Roadmap', 'Log in'])
      await router.push('/saved')
      await settle()
      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('signed-in student', () => {
    it('bookmarks a school from the directory and manages it on the Saved page', async () => {
      await launch()
      await logIn('planner2026')
      await click('nav a', 'Directory')
      const save = () => find<HTMLElement>('article button', '☆ Save')
      save().click()
      await settle()
      expect(navLabels()).toContain('Saved 3')

      await click('nav a', 'Saved 3')
      expect(find('h1').textContent).toBe('Saved institutions')
      expect(document.body.querySelectorAll('main article')).toHaveLength(3)

      await click('button[aria-label="Remove Rosyth School"]')
      expect(document.body.querySelectorAll('main article')).toHaveLength(2)
      expect(navLabels()).toContain('Saved 2')
    })

    it('updates the profile, then generates and saves a roadmap that persists across pages', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      await click('button', 'Save profile')
      expect(find('[role="status"]').textContent).toContain('Profile saved')

      await click('nav a', 'Roadmap')
      await click('button', 'Generate Roadmap')
      expect(text()).toContain('Rule-Based Plan')
      expect(text()).toContain("St. Gabriel's Secondary School")
      expect(text()).toContain('AI-Generated Plan')
      await click('section button', 'Save Roadmap')
      expect(find('[role="status"]').textContent).toContain('Roadmap saved to your profile.')

      await click('nav a', 'Directory')
      await click('nav a', 'Roadmap')
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(text()).toContain('Saved roadmap')
      expect(text()).toContain('Primary → Secondary · Rule-Based Plan')
    })

    it('is told to complete their profile when generating a roadmap without a postal code', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      await type('input[aria-label="Residential postal code"]', '')
      await click('nav a', 'Roadmap')
      await click('button', 'Generate Roadmap')
      expect(dialog()!.textContent).toContain('Missing Profile Information')
      await click('[role="dialog"] button', 'Go to my profile')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(dialog()).toBeNull()
    })

    it('posts, edits and deletes a review on a school profile', async () => {
      await launch()
      await logIn('planner2026')
      await click('nav a', 'Directory')
      await click('article a', 'Rosyth School')

      await type('textarea', 'Lovely campus and friendly staff.')
      await submitForm()
      expect(text()).toContain('Reviews (3)')
      expect(text()).toContain('Your review')

      await click('button', 'Edit Review')
      await type('textarea', 'Lovely campus.')
      await submitForm()
      expect(text()).toContain('Lovely campus.')
      expect(text()).not.toContain('friendly staff')
      expect(text()).toContain('(edited)')

      await click('button', 'Delete Review')
      expect(dialog()!.textContent).toContain('Delete your review?')
      await click('[role="dialog"] button', 'Delete review')
      expect(text()).toContain('Reviews (2)')
      expect(text()).not.toContain('Lovely campus.')
    })

    it('cannot open the admin panel', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      await router.push('/admin')
      await settle()
      expect(router.currentRoute.value.name).toBe('directory')
      expect(find('[role="status"]').textContent).toContain('restricted to administrator')
    })
  })

  it('shows the mobile menu with the same role-gated entries', async () => {
    await launch()
    await logIn('admin')
    await click('button[aria-label="Menu"]')
    const menuLinks = Array.from(document.body.querySelectorAll('#mobile-menu a')).map((a) =>
      a.textContent!.replace(/\s+/g, ' ').trim(),
    )
    expect(menuLinks).toEqual(['Directory', 'Roadmap', 'Saved 2', 'My profile', 'Admin panel'])
  })
})
