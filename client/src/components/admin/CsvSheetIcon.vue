<script setup lang="ts">
/** A spreadsheet page: a header row over a grid of cells. `active` fills the header in. */
defineProps<{ active?: boolean }>()
</script>

<template>
  <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
    <rect
      x="2"
      y="2"
      width="36"
      height="44"
      rx="5"
      class="fill-white transition-colors motion-reduce:transition-none"
      :class="active ? 'stroke-primary' : 'stroke-primary/45'"
      stroke-width="2"
    />
    <path
      d="M2 7a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v8H2z"
      class="transition-colors motion-reduce:transition-none"
      :class="active ? 'fill-primary' : 'fill-primary-tint'"
    />
    <path d="M2 25h36M2 35h36M15 15v31M27 15v31" class="stroke-primary/25" stroke-width="1.5" />
  </svg>
</template>
