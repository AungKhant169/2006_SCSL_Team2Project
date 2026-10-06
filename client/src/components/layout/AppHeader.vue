<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavLinks from './NavLinks.vue'

const menuOpen = ref(false)
const route = useRoute()

// Navigating anywhere closes the mobile menu.
watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)
</script>

<template>
  <header class="border-b border-line bg-white">
    <div class="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <RouterLink
        :to="{ name: 'directory' }"
        class="flex items-center gap-2.5 text-ink no-underline hover:text-ink hover:no-underline"
        aria-label="PathSG home"
      >
        <span
          class="flex size-[30px] items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-white"
          aria-hidden="true"
        >
          P
        </span>
        <span class="flex flex-col leading-[1.1]">
          <span class="text-base font-bold tracking-tight">PathSG</span>
          <span class="text-[11px] text-muted">Education planning platform</span>
        </span>
      </RouterLink>

      <NavLinks class="hidden md:flex" />

      <button
        type="button"
        class="flex size-11 flex-col items-center justify-center gap-[5px] rounded-[10px] border border-line bg-white p-0 md:hidden"
        aria-label="Menu"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu"
        @click="menuOpen = !menuOpen"
      >
        <span v-for="n in 3" :key="n" class="block h-0.5 w-[18px] rounded-[1px] bg-ink" />
      </button>
    </div>

    <div v-if="menuOpen" id="mobile-menu" class="border-t border-line md:hidden">
      <NavLinks orientation="column" />
    </div>
  </header>
</template>
