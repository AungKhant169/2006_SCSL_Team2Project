<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ButtonVariant } from './BaseButton.vue'

/** A router link that looks like a button, for actions that navigate. */
withDefaults(
  defineProps<{
    to: RouteLocationRaw
    variant?: ButtonVariant
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { variant: 'primary', size: 'md' },
)
</script>

<template>
  <RouterLink
    :to="to"
    class="btn"
    :class="[`btn-${variant}`, { 'btn-sm': size === 'sm', 'btn-lg': size === 'lg' }]"
  >
    <slot />
  </RouterLink>
</template>
