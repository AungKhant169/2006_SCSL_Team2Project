<script setup lang="ts">
export interface SelectOption {
  value: string
  label: string
}

defineProps<{ options: readonly SelectOption[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <select v-model="model" class="field-control">
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
