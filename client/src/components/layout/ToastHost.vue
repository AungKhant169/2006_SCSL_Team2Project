<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-6 z-30 flex justify-center" role="status">
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="ui.toast"
        class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-[10px] border border-success-line bg-success-tint py-2.5 pr-2.5 pl-4 text-sm font-semibold text-success-ink shadow-modal"
      >
        <span>{{ ui.toast }}</span>
        <button
          type="button"
          class="border-0 bg-transparent px-1 text-lg leading-none"
          aria-label="Dismiss notification"
          @click="ui.dismissToast()"
        >
          ×
        </button>
      </div>
    </Transition>
  </div>
</template>
