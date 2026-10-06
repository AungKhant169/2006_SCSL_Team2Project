<script setup lang="ts" generic="T extends string">
export interface SegmentOption<V extends string> {
  value: V
  label: string
}

/**
 * - `outlined`: bordered white strip with solid primary selection (directory tier switch)
 * - `tinted`: grey strip with solid primary selection (citizenship switch)
 * - `switch`: grey strip with a white raised selection, items share the width (log in / sign up)
 */
withDefaults(
  defineProps<{
    options: readonly SegmentOption<T>[]
    variant?: 'outlined' | 'tinted' | 'switch'
    label?: string
  }>(),
  { variant: 'tinted' },
)

const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="variant === 'outlined' ? 'segmented-outlined' : 'segmented'"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segmented-item"
      :class="{
        'segmented-item-raised': variant === 'switch',
        'segmented-item-active': option.value === model,
      }"
      :aria-pressed="option.value === model"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
