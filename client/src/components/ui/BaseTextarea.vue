<script setup lang="ts">
const props = defineProps<{
  /** Rewrites typed text before it is stored, e.g. to enforce a word limit. */
  transform?: (value: string) => string
}>()
const model = defineModel<string>({ required: true })

function onInput(event: Event) {
  const el = event.target as HTMLTextAreaElement
  const next = props.transform ? props.transform(el.value) : el.value
  // The model may not change (the user typed past a limit), so correct the field directly.
  if (next !== el.value) el.value = next
  model.value = next
}
</script>

<template>
  <textarea :value="model" class="field-control resize-y leading-normal" @input="onInput" />
</template>
