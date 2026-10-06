<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div class="panel flex flex-col gap-0.5 px-3.5 py-3">
    <span class="caps-label font-normal">{{ label }}</span>
    <div class="text-sm font-semibold">
      <slot>{{ value }}</slot>
    </div>
  </div>
</template>
