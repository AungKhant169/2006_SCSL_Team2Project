import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'

const Blank = defineComponent({ render: () => h('div') })

/** Stand-in pages with the same names and access rules as the real routes. */
export const stubRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'directory', component: Blank },
  { path: '/schools/:id', name: 'school', component: Blank },
  {
    path: '/roadmap',
    name: 'roadmap',
    component: Blank,
    meta: { requiresAuth: true, authMessage: 'Log in to generate and save an education roadmap.' },
  },
  { path: '/login', name: 'login', component: Blank, meta: { guestOnly: true } },
  {
    path: '/profile',
    name: 'profile',
    component: Blank,
    meta: { requiresAuth: true, authMessage: 'Log in to edit your profile.' },
  },
  {
    path: '/saved',
    name: 'saved',
    component: Blank,
    meta: { requiresAuth: true, authMessage: 'Log in to view your saved institutions.' },
  },
  { path: '/admin', name: 'admin', component: Blank, meta: { requiresAdmin: true } },
]

/** A router with guards installed, backed by in-memory history and, by default, stub pages. */
export function createTestRouter(routes: RouteRecordRaw[] = stubRoutes) {
  return createAppRouter(createMemoryHistory(), routes)
}

interface MountOptions {
  /** Location to start on. */
  route?: string
  /** Defaults to the stub pages; pass the real routes for page-level tests. */
  routes?: RouteRecordRaw[]
  props?: Record<string, unknown>
  attachTo?: HTMLElement
}

/** Mounts a component with a fresh Pinia and a guarded router, resolved to `route`. */
export async function mountWithApp(component: Component, options: MountOptions = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createTestRouter(options.routes)
  await router.push(options.route ?? '/')
  await router.isReady()
  const wrapper = mount(component, {
    props: options.props,
    attachTo: options.attachTo,
    global: { plugins: [pinia, router] },
  })
  return { wrapper, router, pinia }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Replaces `fetch` with a fake PathSG auth API. Any username/password is accepted unless a
 * handler overrides it. Returns the mock so tests can assert on the requests made.
 */
export function stubAuthApi(overrides: Partial<Record<string, () => Response>> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input), 'http://localhost').pathname
    const override = overrides[path]
    if (override) return override()
    if (path === '/user/login' || path === '/user/register') {
      return json({ access_token: 'access', refresh_token: 'refresh', token_type: 'bearer' })
    }
    if (path === '/user/logout') return new Response(null, { status: 204 })
    return json({ detail: 'Not found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Logs the given user in through the real auth store (against the stubbed API). */
export async function signInAs(username: string) {
  await useAuthStore().login(username, 'abcd123!')
}
