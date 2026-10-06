<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  /** Renders the label as small upper-case text (search and filter bars). */
  caps?: boolean
}>()

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

const describedBy = computed(
  () => [props.hint && hintId, props.error && errorId].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <div class="field">
    <label :for="id" :class="caps ? 'field-label-caps' : 'field-label'">{{ label }}</label>
    <slot :id="id" :described-by="describedBy" :invalid="Boolean(error)" />
    <span v-if="hint" :id="hintId" class="field-hint">{{ hint }}</span>
    <span v-if="error" :id="errorId" class="field-error" role="alert">{{ error }}</span>
  </div>
</template>
