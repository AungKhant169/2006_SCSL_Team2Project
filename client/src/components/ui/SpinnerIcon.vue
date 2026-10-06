<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'md'
    /** `ai` for the AI panel, `light` on solid buttons, `muted` elsewhere. */
    tone?: 'muted' | 'ai' | 'light'
  }>(),
  { size: 'md', tone: 'muted' },
)
</script>

<template>
  <span
    role="status"
    aria-label="Loading"
    class="block animate-spin-slow rounded-full"
    :class="[
      size === 'sm' ? 'size-3.5 border-2' : 'size-[26px] border-3',
      tone === 'light' && 'border-white/45 border-t-white',
      tone === 'ai' && 'border-line-soft border-t-ai',
      tone === 'muted' && 'border-line-soft border-t-primary',
    ]"
  />
</template>
