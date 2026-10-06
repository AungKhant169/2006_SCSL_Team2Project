<script setup lang="ts">
import { computed } from 'vue'

export type ButtonVariant =
  | 'primary'
  | 'ai'
  | 'danger'
  | 'outline'
  | 'outline-primary'
  | 'outline-danger'
  | 'outline-danger-strong'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  { 'btn-sm': props.size === 'sm', 'btn-lg': props.size === 'lg' },
])
</script>

<template>
  <button :type="type" :class="classes">
    <slot />
  </button>
</template>
