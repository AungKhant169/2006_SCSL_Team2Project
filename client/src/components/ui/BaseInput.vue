<script setup lang="ts">
defineProps<{ invalid?: boolean }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <input v-model="model" class="field-control" :class="{ 'field-control-invalid': invalid }" />
</template>
