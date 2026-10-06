<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
}>()
const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialog = ref<HTMLElement | null>(null)

// Move focus into the dialog when it opens so keyboard users land on it.
watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    dialog.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-6"
      data-testid="modal-backdrop"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="flex w-full max-w-[440px] flex-col gap-3.5 rounded-[14px] bg-white p-6 shadow-modal outline-none"
      >
        <h3 :id="titleId" class="m-0 text-lg font-bold">{{ title }}</h3>
        <div class="text-sm leading-relaxed text-pretty text-soft">
          <slot />
        </div>
        <div class="flex flex-wrap justify-end gap-2 pt-1">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
