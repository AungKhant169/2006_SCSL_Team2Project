import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

/** Access rules for protected pages, plus the banner notice lifecycle (see ui store). */
export function installGuards(router: Router) {
  router.beforeEach((to) => {
    const ui = useUiStore()
    const auth = useAuthStore()
    ui.onNavigate()

    if (to.meta.guestOnly && auth.loggedIn) return { name: 'directory' }

    if (to.meta.requiresAdmin) {
      if (!auth.loggedIn) {
        ui.flashNotice('Log in with an administrator account to open the admin panel.')
        return { name: 'login' }
      }
      if (!auth.isAdmin) {
        ui.flashNotice('The admin panel is restricted to administrator accounts.')
        return { name: 'directory' }
      }
    }

    if (to.meta.requiresAuth && !auth.loggedIn) {
      ui.flashNotice(to.meta.authMessage ?? 'Please log in to continue.')
      return { name: 'login' }
    }
  })
}
