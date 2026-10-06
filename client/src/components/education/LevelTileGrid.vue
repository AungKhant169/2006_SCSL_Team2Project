<script setup lang="ts">
import OptionTile from '@/components/ui/OptionTile.vue'
import { LEVELS } from '@/data/education'
import type { TierId } from '@/types/school'

/** Selectable grid of education levels, shared by the profile and roadmap pages. */
withDefaults(defineProps<{ minTileWidth?: number }>(), { minTileWidth: 170 })

const selected = defineModel<TierId>({ required: true })
</script>

<template>
  <div
    class="grid gap-2.5"
    :style="{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${minTileWidth}px, 100%), 1fr))` }"
  >
    <OptionTile
      v-for="level in LEVELS"
      :key="level.id"
      :tag="level.tag"
      :label="level.label"
      :active="level.id === selected"
      @click="selected = level.id"
    />
  </div>
</template>
