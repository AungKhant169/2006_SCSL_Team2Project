import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { routes } from '@/router'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import App from '../App.vue'

/*
 * End-to-end journeys through the whole shell: real routes (lazy views), header, banner,
 * dialogs and stores, driven only through what a user can click and type, against a fake
 * PathSG server.
 */

let mounted: VueWrapper | undefined

async function settle() {
  await vi.dynamicImportSettled()
  await flushPromises()
}

/** Starts the app on a fake server that already holds two reviews and the planner's two bookmarks. */
async function launch(route = '/') {
  const api: FakeApi = stubApi()
  api.addReview({
    school_id: 2,
    username: 'eastsideparent',
    text: 'Strong Chinese programme.',
    created_at: '2026-09-09T21:14:00+00:00',
  })
  api.addReview({
    school_id: 2,
    username: 'kaiyi88',
    text: 'Teachers respond quickly.',
    created_at: '2026-09-02T07:40:00+00:00',
  })
  for (const user of ['planner2026', 'admin']) api.bookmark(user, 2, 9)
  const app = await mountWithApp(App, { routes, route, attachTo: document.body, api })
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

const KEYWORD = 'input[placeholder^="School name"]'

const navLabels = () =>
  Array.from(document.body.querySelectorAll('header nav > *')).map((el) =>
    el.textContent!.replace(/\s+/g, ' ').trim(),
  )

describe('PathSG app journeys', () => {
  afterEach(() => {
    mounted?.unmount()
    mounted = undefined
  })

  it('opens on the school directory', async () => {
    const { router } = await launch()
    expect(router.currentRoute.value.name).toBe('directory')
    expect(text()).toContain('School Directory')
    expect(text()).toContain('4 schools · Primary')
    expect(navLabels()).toEqual(['Directory', 'Roadmap', 'Log in'])
  })

  describe('guest', () => {
    it('searches, opens a school and reads its profile and reviews', async () => {
      const { router } = await launch()
      await type(KEYWORD, 'rosyth')
      expect(text()).toContain('1 school · Primary')
      await click('article a', 'Rosyth School')
      expect(router.currentRoute.value.fullPath).toBe('/schools/rosyth')
      expect(find('h1').textContent).toBe('Rosyth School')
      expect(text()).toContain('Science in Action')
      expect(text()).toContain('Reviews (2)')
      expect(text()).toContain('eastsideparent')
      // Guests get no bookmark control on the profile.
      expect(text()).not.toContain('☆ Save')
    })

    it('goes back to the directory with the search intact', async () => {
      await launch()
      await type(KEYWORD, 'rosyth')
      await click('article a', 'Rosyth School')
      await click('a', '← Back to directory')
      expect(find<HTMLInputElement>(KEYWORD).value).toBe('rosyth')
      expect(text()).toContain('1 school · Primary')
    })

    it('browses another tier', async () => {
      await launch()
      await click('[aria-label="Education tier"] button', 'Secondary')
      expect(text()).toContain('4 schools · Secondary')
      expect(text()).toContain('Raffles Institution')
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
      const { router } = await launch('/schools/rosyth')
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

    it('reports a school that does not exist', async () => {
      await launch('/schools/nowhere')
      expect(text()).toContain('School not found')
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
      expect(text()).toContain('2,418')
    })

    it('shows an error and stays on the login page when the server refuses', async () => {
      const { router, api } = await launch()
      api.override(
        'POST /user/login',
        () =>
          new Response(JSON.stringify({ detail: 'The password entered is incorrect.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
      )
      await logIn('planner2026')
      expect(router.currentRoute.value.name).toBe('login')
      expect(text()).toContain('The password entered is incorrect.')
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
      const { api } = await launch()
      await logIn('planner2026')
      await click('nav a', 'Directory')
      await click('article button', '☆ Save')
      expect(navLabels()).toContain('Saved 3')
      expect(api.bookmarks['planner2026']).toEqual([2, 9, 1])

      await click('nav a', 'Saved 3')
      expect(find('h1').textContent).toBe('Saved institutions')
      expect(document.body.querySelectorAll('main article')).toHaveLength(3)

      await click('button[aria-label="Remove Rosyth School"]')
      expect(document.body.querySelectorAll('main article')).toHaveLength(2)
      expect(navLabels()).toContain('Saved 2')
      expect(api.bookmarks['planner2026']).toEqual([9, 1])
    })

    it('saves the profile, then generates and saves a roadmap that persists across pages', async () => {
      const { router, api } = await launch()
      await logIn('planner2026')
      await type('input[aria-label="Residential postal code"]', '556000')
      await type('input[placeholder="4 – 32"]', '8')
      await click('button', 'Save profile')
      expect(api.profiles['planner2026']).toMatchObject({ score_a: 8, postal: '556000' })
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(find('h1').textContent).toBe('Education roadmap')
      expect(text()).toContain('Profile saved successfully')

      await click('button', 'Generate Roadmap')
      expect(text()).toContain('Rule-Based Plan')
      expect(text()).toContain("St. Gabriel's Secondary School")
      expect(text()).toContain('AI-Generated Plan')
      expect(text()).toContain('Bukit Panjang Govt. High School')
      await click('section button', 'Save Roadmap')
      expect(find('[role="status"]').textContent).toContain('Roadmap saved to your profile.')
      expect(api.roadmaps['planner2026']?.choices).toEqual([8, 5, 6])

      await click('nav a', 'Directory')
      await click('nav a', 'Roadmap')
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(text()).toContain('Saved roadmap')
      expect(text()).toContain('Primary → Secondary · Rule-Based Plan')
    })

    it('finds their profile and roadmap again after logging back in', async () => {
      await launch()
      await logIn('planner2026')
      await type('input[aria-label="Residential postal code"]', '556000')
      await type('input[placeholder="4 – 32"]', '8')
      await click('button', 'Save profile')
      await click('button', 'Generate Roadmap')
      await click('section button', 'Save Roadmap')
      await click('header button', 'planner2026 · Log out')

      await logIn('planner2026')
      expect(find<HTMLInputElement>('input[aria-label="Residential postal code"]').value).toBe(
        '556000',
      )
      expect(find<HTMLInputElement>('input[placeholder="4 – 32"]').value).toBe('8')
      await click('nav a', 'Roadmap')
      expect(text()).toContain('Saved roadmap')
    })

    it('is told to complete their profile when generating a roadmap without a postal code', async () => {
      const { router } = await launch()
      await logIn('planner2026')
      await click('nav a', 'Roadmap')
      await click('button', 'Generate Roadmap')
      expect(dialog()!.textContent).toContain('Missing Profile Information')
      await click('[role="dialog"] button', 'Go to my profile')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(dialog()).toBeNull()
    })

    it('can dismiss the profile toast on the roadmap page', async () => {
      await launch()
      await logIn('planner2026')
      await type('input[aria-label="Residential postal code"]', '556000')
      await type('input[placeholder="4 – 32"]', '8')
      await click('button', 'Save profile')
      expect(text()).toContain('Profile saved successfully')
      await click('button[aria-label="Dismiss notification"]')
      expect(text()).not.toContain('Profile saved successfully')
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

  describe('administrator', () => {
    it('updates the school dataset from the admin panel', async () => {
      const { api } = await launch()
      await logIn('admin')
      const picker = find<HTMLInputElement>('input[type="file"]')
      Object.defineProperty(picker, 'files', {
        value: [new File(['a,b'], 'moe.csv', { type: 'text/csv' })],
        configurable: true,
      })
      picker.dispatchEvent(new Event('change', { bubbles: true }))
      await settle()
      await click('button', 'Update Dataset')
      expect(find('[role="alert"]').textContent).toContain(
        'Database updated successfully with the latest Singapore school data',
      )
      expect(text()).toContain('2,424')
      expect(api.callsTo('POST /admin/dataset/update')).toHaveLength(1)
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
