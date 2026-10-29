<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { getLevel } from '@/data/education'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import PlanMap from './PlanMap.vue'
import PlanNodeList from './PlanNodeList.vue'
import RuleAboutDialog from './RuleAboutDialog.vue'
import RuleSortControl from './RuleSortControl.vue'

defineEmits<{ save: [] }>()

const roadmap = useRoadmapStore()
const profile = useProfileStore()
const aboutOpen = ref(false)

const summary = computed(() => {
  if (roadmap.ruleSort === 'distance') return `schools nearest to ${profile.postal} first.`
  const limit = roadmap.ruleLimitKm === null ? '' : `, within ${roadmap.ruleLimitKm} km`
  return `fit with your score first, then proximity to ${profile.postal}${limit}.`
})

/** A distance limit can leave no school, which is not the same as a stage without institutions. */
const empty = computed(() =>
  roadmap.ruleLimitKm === null
    ? undefined
    : `No schools are within ${roadmap.ruleLimitKm} km of ${profile.postal}. Try a larger distance.`,
)
</script>

<template>
  <SectionCard title="Rule-Based Plan">
    <template v-if="roadmap.ruleSorts.length > 0" #actions>
      <BaseButton variant="outline" size="sm" @click="aboutOpen = true">About</BaseButton>
    </template>

    <p class="m-0 text-[13px] text-muted">
      Applies the {{ getLevel(roadmap.stage).tag }} rule set: {{ summary }}
    </p>

    <RuleSortControl />

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
      <PlanNodeList :nodes="roadmap.rulePlan" :from="getLevel(roadmap.stage).from" :empty="empty" />
      <PlanMap :nodes="roadmap.rulePlan" :origin="roadmap.origin" />
      <BaseButton
        class="self-start"
        :disabled="roadmap.rulePlan.length === 0"
        @click="$emit('save')"
      >
        Save Roadmap
      </BaseButton>
    </template>

    <RuleAboutDialog :open="aboutOpen" @close="aboutOpen = false" />
  </SectionCard>
</template>
