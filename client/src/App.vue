<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import ModalHost from '@/components/layout/ModalHost.vue'
import NoticeBanner from '@/components/layout/NoticeBanner.vue'
</script>

<template>
  <div class="flex min-h-screen justify-center sm:px-4 sm:py-6">
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
</template>
