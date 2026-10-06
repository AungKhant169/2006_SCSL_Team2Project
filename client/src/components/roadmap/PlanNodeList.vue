<script setup lang="ts">
import type { PlanNode } from '@/types/roadmap'

withDefaults(
  defineProps<{
    nodes: PlanNode[]
    /** Where the student currently is, e.g. "Primary school (current)". */
    from: string
    /** `ai` colours the step markers purple to tell the AI plan apart from the rule-based one. */
    tone?: 'primary' | 'ai'
  }>(),
  { tone: 'primary' },
)
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <!-- The starting point is plain text, deliberately not styled like a school node. -->
    <div
      class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-dashed border-line px-0.5 pb-2.5"
    >
      <span class="caps-label font-bold tracking-wider">Starting from</span>
      <span class="text-[13px] text-soft">{{ from }} — currently enrolled, per your profile</span>
    </div>

    <p v-if="nodes.length === 0" class="m-0 text-[13px] text-muted">
      No institutions are available for this stage yet.
    </p>

    <ol v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
      <li v-for="node in nodes" :key="node.step" class="flex items-start gap-3 panel px-3.5 py-3">
        <span
          class="flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="tone === 'ai' ? 'bg-ai-tint text-ai' : 'bg-primary-tint text-primary'"
        >
          {{ node.step }}
        </span>
        <div class="flex min-w-0 flex-col gap-[3px]">
          <span class="caps-label">{{ node.label }}</span>
          <span class="text-sm font-semibold">{{ node.schoolName }}</span>
          <span class="text-xs text-muted">{{ node.detail }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>
