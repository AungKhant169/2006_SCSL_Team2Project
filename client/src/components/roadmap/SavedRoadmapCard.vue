<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { getLevel } from '@/data/education'
import { useRoadmapStore } from '@/stores/roadmap'
import PlanNodeList from './PlanNodeList.vue'
import RoadmapEditor from './RoadmapEditor.vue'

defineEmits<{ edit: []; delete: []; saveEdits: []; cancelEdit: [] }>()

const roadmap = useRoadmapStore()
</script>

<template>
  <SectionCard
    v-if="roadmap.saved"
    title="Saved roadmap"
    :hint="`${getLevel(roadmap.saved.stage).tag} · ${roadmap.saved.source}`"
  >
    <template v-if="!roadmap.editing" #actions>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outline" @click="$emit('edit')">Edit Roadmap</BaseButton>
        <BaseButton variant="outline-danger" @click="$emit('delete')">Delete Roadmap</BaseButton>
      </div>
    </template>

    <RoadmapEditor
      v-if="roadmap.editing"
      @save="$emit('saveEdits')"
      @cancel="$emit('cancelEdit')"
    />
    <PlanNodeList v-else :nodes="roadmap.savedPlan" :from="getLevel(roadmap.saved.stage).from" />
  </SectionCard>
</template>
