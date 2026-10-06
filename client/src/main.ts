import './assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createAppRouter } from './router'
import { useAuthStore } from './stores/auth'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // Resume a saved session first so reloading a protected page does not bounce to the login page.
  await useAuthStore(pinia).restore()

  app.use(createAppRouter())
  app.mount('#app')
}

void bootstrap()
