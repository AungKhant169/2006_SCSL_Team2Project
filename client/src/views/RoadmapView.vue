<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import LevelTileGrid from '@/components/education/LevelTileGrid.vue'
import AiPlanPanel from '@/components/roadmap/AiPlanPanel.vue'
import RulePlanPanel from '@/components/roadmap/RulePlanPanel.vue'
import SavedRoadmapCard from '@/components/roadmap/SavedRoadmapCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { getLevel } from '@/data/education'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import { useUiStore } from '@/stores/ui'
import { describeScore } from '@/utils/profileValidation'
import type { PlanSource } from '@/types/roadmap'

const roadmap = useRoadmapStore()
const profile = useProfileStore()
const ui = useUiStore()
const router = useRouter()

const preselectNote = computed(
  () =>
    `Pre-selected from your profile: ${getLevel(roadmap.stage).tag} · ` +
    `${describeScore(profile.level, profile.scoreA)} · ` +
    `postal ${profile.postalValid ? profile.postal : 'missing'}`,
)

/** Generation is blocked until a valid postal code is on file (REQ-3.12). */
function generate() {
  if (roadmap.generate()) {
    ui.clearNotice()
    return
  }
  ui.openModal('postal', () => router.push({ name: 'profile' }))
}

/** Only one roadmap can be kept, so replacing it needs confirmation (REQ-3.11). */
function save(source: PlanSource) {
  const commit = () => {
    roadmap.save(source)
    ui.setNotice('Roadmap saved to your profile.')
  }
  if (roadmap.hasSaved) ui.openModal('overwrite', commit)
  else commit()
}

function saveEdits() {
  roadmap.saveEdits()
  ui.setNotice('Roadmap updated.')
}

function askDelete() {
  ui.openModal('delRoadmap', () => {
    roadmap.remove()
    ui.setNotice('Saved roadmap deleted.')
  })
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="Education roadmap"
      subtitle="Two plans per generation: a rule-based pathway from official entry rules, and an AI-generated alternative. One roadmap can be saved at a time."
    />

    <SectionCard title="Target transition stage" :hint="preselectNote">
      <template #actions>
        <BaseButton size="lg" class="text-sm" @click="generate">Generate Roadmap</BaseButton>
      </template>
      <LevelTileGrid
        :model-value="roadmap.stage"
        :min-tile-width="190"
        @update:model-value="roadmap.selectStage"
      />
    </SectionCard>

    <div
      v-if="roadmap.generated"
      class="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5"
    >
      <RulePlanPanel @save="save('Rule-Based Plan')" />
      <AiPlanPanel @save="save('AI-Generated Plan')" />
    </div>

    <SavedRoadmapCard
      v-if="roadmap.showSaved"
      @edit="roadmap.startEdit()"
      @delete="askDelete"
      @save-edits="saveEdits"
      @cancel-edit="roadmap.cancelEdit()"
    />

    <EmptyState
      v-if="roadmap.showEmpty"
      title="No roadmap saved yet"
      message="Generate a pathway for your target transition stage, compare the rule-based and AI plans, then save the one you prefer."
    >
      <BaseButton size="lg" class="mt-2 text-sm" @click="generate">Generate Roadmap</BaseButton>
    </EmptyState>
  </div>
</template>
