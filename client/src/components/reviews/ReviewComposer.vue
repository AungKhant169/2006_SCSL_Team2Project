<script setup lang="ts">
import { computed, useId } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { clampWords, countWords, MAX_REVIEW_WORDS } from '@/utils/reviewText'

defineProps<{
  title: string
  submitLabel: string
  /** Editing an existing review shows a Cancel button. */
  cancellable?: boolean
  error?: string
}>()

defineEmits<{ submit: []; cancel: [] }>()

const text = defineModel<string>({ required: true })
const textareaId = useId()

const words = computed(() => countWords(text.value))
const atLimit = computed(() => words.value >= MAX_REVIEW_WORDS)
</script>

<template>
  <form class="flex flex-col gap-2 panel p-3.5" @submit.prevent="$emit('submit')">
    <label :for="textareaId" class="field-label">{{ title }}</label>
    <BaseTextarea
      :id="textareaId"
      v-model="text"
      rows="4"
      :transform="clampWords"
      placeholder="What should other families know about this school? Facilities, culture, commute, CCAs…"
    />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span
        class="text-xs font-semibold"
        :class="atLimit ? 'text-danger' : 'text-muted'"
        aria-live="polite"
        data-testid="word-counter"
      >
        {{ words }} / {{ MAX_REVIEW_WORDS }} words
      </span>
      <div class="flex gap-2">
        <BaseButton v-if="cancellable" variant="outline" @click="$emit('cancel')"
          >Cancel</BaseButton
        >
        <BaseButton type="submit">{{ submitLabel }}</BaseButton>
      </div>
    </div>
    <AlertMessage v-if="error">{{ error }}</AlertMessage>
  </form>
</template>
