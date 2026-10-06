<script setup lang="ts">
import { computed } from 'vue'
import { passwordRules } from '@/utils/credentials'

const props = defineProps<{ password: string }>()

/** Live checklist of the complexity rules (REQ-2.3); sign up stays blocked until all pass. */
const rules = computed(() => passwordRules(props.password))
</script>

<template>
  <ul
    class="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]"
    aria-label="Password requirements"
  >
    <li
      v-for="rule in rules"
      :key="rule.id"
      class="flex items-center gap-2"
      :class="rule.met ? 'text-ink' : 'text-muted'"
      :data-met="rule.met"
    >
      <span
        class="flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
        :class="rule.met ? 'bg-success' : 'bg-rule-off'"
        aria-hidden="true"
      >
        {{ rule.met ? '✓' : '·' }}
      </span>
      {{ rule.label }}
    </li>
  </ul>
</template>
