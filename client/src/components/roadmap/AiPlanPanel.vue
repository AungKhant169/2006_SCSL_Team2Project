<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { getLevel } from '@/data/education'
import { useRoadmapStore } from '@/stores/roadmap'
import PlanNodeList from './PlanNodeList.vue'

defineEmits<{ save: [] }>()

const roadmap = useRoadmapStore()
</script>

<template>
  <SectionCard title="AI-Generated Plan">
    <!-- Loading and failure stay inside this panel so the rule-based plan is never affected. -->
    <div
      v-if="roadmap.aiStatus === 'loading'"
      class="flex flex-col items-center gap-3 py-[18px] text-center"
      role="status"
    >
      <SpinnerIcon tone="ai" />
      <span class="text-[13px] text-muted">
        Generating an alternative pathway from your profile… the rule-based plan is already
        complete.
      </span>
    </div>

    <div
      v-else-if="roadmap.aiStatus === 'error'"
      class="flex flex-col gap-3 rounded-[10px] border border-danger-line bg-danger-tint p-4"
      role="alert"
    >
      <span class="text-sm font-semibold text-danger">
        Unable to generate AI recommendation at this time. Please try again.
      </span>
      <BaseButton
        variant="outline-danger-strong"
        size="sm"
        class="self-start"
        @click="roadmap.runAi()"
      >
        Retry AI Generation
      </BaseButton>
    </div>

    <template v-else-if="roadmap.aiStatus === 'ready'">
      <p class="m-0 text-[13px] text-muted">
        Alternative ordering weighted towards benchmark fit and programme spread rather than
        distance alone.
      </p>
      <PlanNodeList :nodes="roadmap.aiPlan" :from="getLevel(roadmap.stage).from" tone="ai" />
      <BaseButton variant="ai" class="self-start" @click="$emit('save')">Save Roadmap</BaseButton>
    </template>
  </SectionCard>
</template>
