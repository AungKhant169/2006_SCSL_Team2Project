import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createAppRouter, routes } from '@/router'
import { signInAs, stubAuthApi } from '@/test/helpers'

/** Exercises the real route table (lazy views, params, redirects) rather than stubs. */
const realRouter = () => createAppRouter(createMemoryHistory(), routes)

describe('route table', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubAuthApi()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('names every page of the app', () => {
    const names = routes.map((r) => r.name).filter(Boolean)
    expect(names).toEqual(['directory', 'school', 'roadmap', 'login', 'profile', 'saved', 'admin'])
  })

  it('lazy-loads a component for every page', async () => {
    for (const route of routes) {
      if ('redirect' in route) continue
      const component = (route as unknown as { component: () => Promise<{ default: unknown }> })
        .component
      expect((await component()).default).toBeTruthy()
    }
  })

  it('passes the school id from the URL to the profile page as a prop', async () => {
    const router = realRouter()
    await router.push('/schools/14')
    const record = router.currentRoute.value.matched[0]!
    expect(router.currentRoute.value.name).toBe('school')
    expect(router.resolve({ name: 'school', params: { id: 14 } }).href).toBe('/schools/14')
    expect(record.props.default).toBe(true)
  })

  it('sends unknown addresses to the directory', async () => {
    const router = realRouter()
    await router.push('/no/such/page')
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('protects the same pages the design gates behind an account', async () => {
    const router = realRouter()
    for (const path of ['/saved', '/profile', '/roadmap', '/admin']) {
      await router.push(path)
      expect(router.currentRoute.value.name, path).toBe('login')
    }
  })

  it('lets a student reach their pages but not the admin panel (REQ-5.7)', async () => {
    const router = realRouter()
    await signInAs('planner2026')
    for (const name of ['saved', 'profile', 'roadmap']) {
      await router.push({ name })
      expect(router.currentRoute.value.name).toBe(name)
    }
    await router.push({ name: 'admin' })
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('lets the admin account reach the admin panel', async () => {
    const router = realRouter()
    await signInAs('admin')
    await router.push({ name: 'admin' })
    expect(router.currentRoute.value.name).toBe('admin')
  })
})
