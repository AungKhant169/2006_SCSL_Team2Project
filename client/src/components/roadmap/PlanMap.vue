<script setup lang="ts">
import { computed } from 'vue'
import LocationMap from '@/components/ui/LocationMap.vue'
import type { Origin } from '@/services/locationService'
import type { MapPin } from '@/types/map'
import type { PlanNode } from '@/types/roadmap'
import { homePin } from '@/utils/mapPin'

const props = withDefaults(
  defineProps<{
    nodes: PlanNode[]
    /** The centre of the student's postal district. The home pin is left out until it is known. */
    origin: Origin | null
    /** `ai` colours the pins purple to match the AI plan's step markers. */
    tone?: 'primary' | 'ai'
  }>(),
  { tone: 'primary' },
)

type Placed = PlanNode & { latitude: number; longitude: number }
const isPlaced = (node: PlanNode): node is Placed =>
  node.latitude !== null && node.longitude !== null

const placed = computed(() => props.nodes.filter(isPlaced))
const unplaced = computed(() => props.nodes.filter((node) => !isPlaced(node)))

const pins = computed<MapPin[]>(() => [
  ...(props.origin ? [homePin(props.origin, 'Your postal district')] : []),
  ...placed.value.map((node) => ({
    at: [node.latitude, node.longitude] as [number, number],
    mark: node.step,
    label: `${node.label}: ${node.schoolName}`,
    heading: node.schoolName,
    lines: [node.label, node.detail].filter(Boolean),
  })),
])
</script>

<template>
  <figure v-if="placed.length > 0" class="flex flex-col gap-2">
    <LocationMap :pins="pins" :tone="tone" label="Map of the recommended schools" class="h-64" />
    <figcaption class="text-xs text-muted">
      Numbers match the steps above.
      <template v-if="origin">
        The house marks the centre of your postal district, where distances are measured from.
      </template>
      <template v-if="unplaced.length > 0">
        Not shown, as their location is not available:
        {{ unplaced.map((node) => node.label).join(', ') }}.
      </template>
    </figcaption>
  </figure>
</template>
