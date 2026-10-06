<script setup lang="ts">
defineProps<{
  /** Small caption above the label, e.g. "Primary → Secondary". */
  tag: string
  label: string
  active?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="option-tile"
    :class="{ 'option-tile-active': active }"
    :aria-pressed="active"
  >
    <span class="caps-label text-primary">{{ tag }}</span>
    <span class="text-sm leading-snug font-semibold">{{ label }}</span>
  </button>
</template>
