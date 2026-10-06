import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { createTestRouter, signInAs, stubAuthApi } from '@/test/helpers'

describe('route guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubAuthApi()
  })
  afterEach(() => vi.unstubAllGlobals())

  describe('pages that need an account (REQ-2.17, BR-2)', () => {
    it.each([
      ['/saved', 'Log in to view your saved institutions.'],
      ['/profile', 'Log in to edit your profile.'],
      ['/roadmap', 'Log in to generate and save an education roadmap.'],
    ])('sends a guest from %s to the login page with an explanation', async (path, message) => {
      const router = createTestRouter()
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('login')
      expect(useUiStore().notice).toBe(message)
    })

    it('lets a signed-in user through and shows no notice', async () => {
      const router = createTestRouter()
      await signInAs('planner2026')
      for (const name of ['saved', 'profile', 'roadmap']) {
        await router.push({ name })
        expect(router.currentRoute.value.name).toBe(name)
        expect(useUiStore().notice).toBe('')
      }
    })

    it('keeps the explanation on the login page until the next navigation', async () => {
      const router = createTestRouter()
      await router.push('/saved')
      expect(useUiStore().notice).not.toBe('')
      await router.push('/')
      expect(useUiStore().notice).toBe('')
    })
  })

  describe('public pages', () => {
    it('lets guests open the directory, school profiles and the login page', async () => {
      const router = createTestRouter()
      for (const path of ['/', '/schools/2', '/login']) {
        await router.push(path)
        expect(router.currentRoute.value.path).toBe(path)
      }
    })

    it('dismisses a page notice when the user navigates', async () => {
      const router = createTestRouter()
      useUiStore().setNotice('Roadmap saved to your profile.')
      await router.push('/login')
      expect(useUiStore().notice).toBe('')
    })
  })

  describe('login page', () => {
    it('is not shown to a user who is already signed in', async () => {
      const router = createTestRouter()
      await signInAs('planner2026')
      await router.push('/login')
      expect(router.currentRoute.value.name).toBe('directory')
    })
  })

  describe('admin panel (REQ-5.7, BR-5)', () => {
    it('sends a guest to the login page', async () => {
      const router = createTestRouter()
      await router.push('/admin')
      expect(router.currentRoute.value.name).toBe('login')
      expect(useUiStore().notice).toMatch(/administrator account/)
    })

    it('turns a regular account back to the directory with a notice', async () => {
      const router = createTestRouter()
      await signInAs('planner2026')
      await router.push('/admin')
      expect(router.currentRoute.value.name).toBe('directory')
      expect(useUiStore().notice).toMatch(/restricted to administrator/)
    })

    it('admits the admin account', async () => {
      const router = createTestRouter()
      await signInAs('admin')
      await router.push('/admin')
      expect(router.currentRoute.value.name).toBe('admin')
    })
  })
})
