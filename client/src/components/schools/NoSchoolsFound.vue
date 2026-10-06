<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

defineEmits<{ reset: [] }>()

const suggestions = ['Widen distance', 'Check spelling', 'Try another tier']
</script>

<template>
  <EmptyState
    title="No Schools Found"
    message="No schools match your search criteria. Try clearing filters or adjusting your search keywords."
  >
    <template #icon>
      <div
        class="flex size-14 items-center justify-center rounded-full bg-chip text-[22px] font-bold text-muted"
        aria-hidden="true"
      >
        0
      </div>
    </template>
    <ul class="m-0 flex list-none flex-wrap justify-center gap-2 p-0 text-[13px] text-muted">
      <li
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="rounded-full border border-line px-3 py-1"
      >
        {{ suggestion }}
      </li>
    </ul>
    <BaseButton class="mt-2" @click="$emit('reset')">Reset All Filters</BaseButton>
  </EmptyState>
</template>
