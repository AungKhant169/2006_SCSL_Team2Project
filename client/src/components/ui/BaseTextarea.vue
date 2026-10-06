<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea v-model="model" class="field-control resize-y leading-normal" />
</template>
