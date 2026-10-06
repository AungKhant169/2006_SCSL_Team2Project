import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import { installGuards } from './guards'

export const routes: RouteRecordRaw[] = []

/** Builds the app router. Tests pass a memory history and, where needed, their own routes. */
export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
  routeRecords: RouteRecordRaw[] = routes,
) {
  const router = createRouter({ history, routes: routeRecords })
  installGuards(router)
  return router
}
