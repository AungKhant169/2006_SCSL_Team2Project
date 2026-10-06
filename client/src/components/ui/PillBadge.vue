<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'primary' | 'solid'
    size?: 'sm' | 'lg'
  }>(),
  { variant: 'neutral', size: 'sm' },
)
</script>

<template>
  <span
    class="pill"
    :class="{
      'pill-lg': size === 'lg',
      'pill-primary': variant === 'primary',
      'pill-solid': variant === 'solid',
    }"
  >
    <slot />
  </span>
</template>
