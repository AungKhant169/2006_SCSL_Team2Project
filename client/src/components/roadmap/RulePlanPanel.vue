<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { getLevel } from '@/data/education'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import PlanNodeList from './PlanNodeList.vue'

defineEmits<{ save: [] }>()

const roadmap = useRoadmapStore()
const profile = useProfileStore()
</script>

<template>
  <SectionCard title="Rule-Based Plan">
    <p class="m-0 text-[13px] text-muted">
      Applies the {{ getLevel(roadmap.stage).tag }} rule set: eligibility against your score, then
      proximity to {{ profile.postal }}.
    </p>

    <!-- Loading and failure stay inside this panel so the AI plan is never affected. -->
    <div
      v-if="roadmap.ruleStatus === 'loading'"
      class="flex flex-col items-center gap-3 py-[18px] text-center"
      role="status"
    >
      <SpinnerIcon />
      <span class="text-[13px] text-muted">Ranking institutions for your stage…</span>
    </div>

    <div
      v-else-if="roadmap.ruleStatus === 'error'"
      class="flex flex-col gap-3 rounded-[10px] border border-danger-line bg-danger-tint p-4"
      role="alert"
    >
      <span class="text-sm font-semibold text-danger">
        Unable to generate the rule-based plan at this time. Please try again.
      </span>
      <BaseButton
        variant="outline-danger-strong"
        size="sm"
        class="self-start"
        @click="roadmap.runRule()"
      >
        Retry
      </BaseButton>
    </div>

    <template v-else-if="roadmap.ruleStatus === 'ready'">
      <PlanNodeList :nodes="roadmap.rulePlan" :from="getLevel(roadmap.stage).from" />
      <BaseButton
        class="self-start"
        :disabled="roadmap.rulePlan.length === 0"
        @click="$emit('save')"
      >
        Save Roadmap
      </BaseButton>
    </template>
  </SectionCard>
</template>
