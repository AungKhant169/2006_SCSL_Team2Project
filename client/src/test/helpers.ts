import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createAppRouter, routes } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { stubApi } from './fakeApi'
import type { FakeApi } from './fakeApi'

const Blank = defineComponent({ render: () => h('div') })

/** The real routes (names, params, access rules) with every page swapped for an empty stub. */
export const stubRoutes: RouteRecordRaw[] = routes.map((route) =>
  'redirect' in route ? route : ({ ...route, component: Blank } as RouteRecordRaw),
)

/** A router with guards installed, backed by in-memory history and, by default, stub pages. */
export function createTestRouter(routeRecords: RouteRecordRaw[] = stubRoutes) {
  return createAppRouter(createMemoryHistory(), routeRecords)
}

interface MountOptions {
  /** Location to start on. */
  route?: string
  /** Defaults to the stub pages; pass the real routes for page-level tests. */
  routes?: RouteRecordRaw[]
  props?: Record<string, unknown>
  attachTo?: HTMLElement
  /** Signs this user in (against the fake API) before mounting. Use 'admin' for the Admin role. */
  signedInAs?: string
  /** The fake server to talk to. Pass one to set up its data first; defaults to a fresh one. */
  api?: FakeApi
}

/**
 * Mounts a component with a fresh Pinia and a guarded router, resolved to `route`, against a fake
 * PathSG server (returned as `api`).
 */
export async function mountWithApp(component: Component, options: MountOptions = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const api = options.api ?? stubApi()
  if (options.signedInAs) await signInAs(options.signedInAs)
  const router = createTestRouter(options.routes)
  await router.push(options.route ?? '/')
  await router.isReady()
  const wrapper = mount(component, {
    props: options.props,
    attachTo: options.attachTo,
    global: { plugins: [pinia, router] },
  })
  return { wrapper, router, pinia, api }
}

/** Logs the given user in through the real auth store (against the fake API). */
export async function signInAs(username: string) {
  return useAuthStore().login(username, 'abcd123!')
}
