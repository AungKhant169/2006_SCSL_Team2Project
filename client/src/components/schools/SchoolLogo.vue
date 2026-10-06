<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    schoolId: number
    name: string
    acronym: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

// Logos are named after the school id (e.g. 2.png). Schools without a file show their acronym.
const logos = import.meta.glob<string>('@/assets/logos/*.png', { eager: true, import: 'default' })

const src = computed(() => {
  const match = Object.entries(logos).find(([path]) => path.endsWith(`/${props.schoolId}.png`))
  return match?.[1]
})

const sizeClass = {
  sm: 'size-11 rounded-[10px]',
  md: 'size-[52px] rounded-[10px]',
  lg: 'size-[72px] rounded-[14px]',
}
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden border border-line-soft bg-white"
    :class="sizeClass[size]"
  >
    <img v-if="src" :src="src" :alt="`${name} badge`" class="size-full object-contain" />
    <span v-else class="text-xs font-bold text-muted" :aria-label="`${name} badge`">
      {{ acronym }}
    </span>
  </div>
</template>
