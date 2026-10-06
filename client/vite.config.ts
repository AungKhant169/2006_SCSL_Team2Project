import { fileURLToPath, URL } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), tailwindcss(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Parse the port as an integer; fall back to Vite's default if not set
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 5173,
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/__tests__/**/*.spec.ts'],
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
    },
  }
})
