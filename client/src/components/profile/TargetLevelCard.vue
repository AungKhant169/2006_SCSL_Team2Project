<script setup lang="ts">
import LevelTileGrid from '@/components/education/LevelTileGrid.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { useProfileStore } from '@/stores/profile'

const profile = useProfileStore()
</script>

<template>
  <SectionCard hint="The upcoming transition you are planning for. Pre-selects your roadmap stage.">
    <template #title>
      Target education level <span class="text-danger" aria-hidden="true">*</span>
    </template>
    <LevelTileGrid :model-value="profile.level" @update:model-value="profile.setLevel" />
  </SectionCard>
</template>
