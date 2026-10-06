<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'danger' | 'success' }>(), { variant: 'danger' })
</script>

<template>
  <div :class="variant === 'success' ? 'alert-success' : 'alert alert-danger'" role="alert">
    <slot />
  </div>
</template>
