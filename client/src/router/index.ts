import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import SamplePage from '@/components/SamplePage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'SamplePage',
    component: SamplePage
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router