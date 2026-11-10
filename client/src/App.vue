<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DemoSpotlight from '@/demo/DemoSpotlight.vue'
import { useDemoSession } from '@/demo/session'
import '@/demo/demo.css'
import AppHeader from '@/components/layout/AppHeader.vue'
import ModalHost from '@/components/layout/ModalHost.vue'
import NoticeBanner from '@/components/layout/NoticeBanner.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
const route = useRoute()
const demo = useDemoSession()
onMounted(() => {
  if (!route.path.startsWith('/demo')) demo.resumeDisplay()
})
</script>

<template>
  <RouterView v-if="route.path.startsWith('/demo')" />
  <div v-else class="flex min-h-screen justify-center sm:px-4 sm:py-6">
    <div
      class="flex w-full max-w-[1180px] flex-col overflow-hidden bg-surface sm:rounded-[14px] sm:border sm:border-line sm:shadow-frame"
    >
      <AppHeader />
      <NoticeBanner />
      <main class="flex flex-1 flex-col">
        <RouterView />
      </main>
    </div>
  </div>
  <ModalHost />
  <ToastHost />
  <DemoSpotlight v-if="demo.credentials?.role === 'display' && !route.path.startsWith('/demo')" />
</template>
