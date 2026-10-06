<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
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
    <PlanNodeList :nodes="roadmap.rulePlan" :from="getLevel(roadmap.stage).from" />
    <BaseButton class="self-start" @click="$emit('save')">Save Roadmap</BaseButton>
  </SectionCard>
</template>
