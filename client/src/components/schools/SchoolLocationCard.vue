<script setup lang="ts">
import { computed } from 'vue'
import LocationMap from '@/components/ui/LocationMap.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import type { Origin } from '@/services/locationService'
import type { MapPin } from '@/types/map'
import type { SchoolProfile } from '@/types/school'
import { homePin } from '@/utils/mapPin'

const props = defineProps<{
  school: SchoolProfile
  /** Where distances are measured from, once the server has placed the reference postal code. */
  origin: Origin | null
  /** The reference postal code the origin belongs to. */
  postal: string
}>()

const schoolPin = computed<MapPin | null>(() => {
  const { latitude, longitude, name, address, postal, mrt } = props.school
  if (latitude === null || longitude === null) return null
  const lines = [address && `${address}${postal ? `, Singapore ${postal}` : ''}`]
  if (mrt) lines.push(`Nearest MRT: ${mrt}`)
  return {
    at: [latitude, longitude],
    mark: 'school',
    label: name,
    heading: name,
    lines: lines.filter(Boolean),
  }
})

const pins = computed<MapPin[]>(() =>
  schoolPin.value
    ? [
        ...(props.origin ? [homePin(props.origin, 'Distance reference point')] : []),
        schoolPin.value,
      ]
    : [],
)
</script>

<template>
  <SectionCard title="Location">
    <figure v-if="schoolPin" class="flex flex-col gap-2">
      <LocationMap :pins="pins" :label="`Map showing ${school.name}`" class="h-72" />
      <figcaption v-if="origin" class="text-xs text-muted">
        The house marks the centre of the postal district of {{ postal }}, where the distance above
        is measured from.
      </figcaption>
    </figure>
    <p v-else class="m-0 text-sm text-muted">Not available</p>
  </SectionCard>
</template>
