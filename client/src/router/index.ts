import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import { installGuards } from './guards'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'directory',
    component: () => import('@/views/DirectoryView.vue'),
  },
  {
    path: '/schools/:id',
    name: 'school',
    component: () => import('@/views/SchoolDetailView.vue'),
    props: true,
  },
  {
    path: '/roadmap',
    name: 'roadmap',
    component: () => import('@/views/RoadmapView.vue'),
    meta: { requiresAuth: true, authMessage: 'Log in to generate and save an education roadmap.' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, authMessage: 'Log in to edit your profile.' },
  },
  {
    path: '/saved',
    name: 'saved',
    component: () => import('@/views/SavedView.vue'),
    meta: { requiresAuth: true, authMessage: 'Log in to view your saved institutions.' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'directory' } },
]

/** Builds the app router. Tests pass a memory history and, where needed, their own routes. */
export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
  routeRecords: RouteRecordRaw[] = routes,
) {
  const router = createRouter({
    history,
    routes: routeRecords,
    scrollBehavior: () => ({ top: 0 }),
  })
  installGuards(router)
  return router
}
