<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()
</script>

<template>
  <div class="card-empty">
    <slot name="icon" />
    <h3 class="m-0 text-lg font-bold">{{ title }}</h3>
    <p v-if="message" class="m-0 max-w-[420px] text-sm leading-normal text-muted">{{ message }}</p>
    <slot />
  </div>
</template>
