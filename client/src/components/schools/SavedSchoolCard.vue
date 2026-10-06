<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import { getTier } from '@/data/education'
import type { School } from '@/types/school'
import { formatLatestBenchmark } from '@/utils/benchmark'
import { formatDistance } from '@/utils/format'
import SchoolLogo from './SchoolLogo.vue'

defineProps<{
  school: School
  hasPostal: boolean
}>()

defineEmits<{ remove: [] }>()
</script>

<template>
  <article class="card flex flex-col gap-3.5 p-[18px]">
    <div class="flex items-center gap-3">
      <SchoolLogo :school-id="school.id" :name="school.name" :acronym="school.acronym" size="sm" />
      <div class="flex min-w-0 flex-col gap-[3px]">
        <RouterLink
          :to="{ name: 'school', params: { id: school.id } }"
          class="text-[15px] font-bold text-ink hover:text-primary"
        >
          {{ school.name }}
        </RouterLink>
        <span class="text-xs text-muted">{{ school.type }} · {{ getTier(school.tier).label }}</span>
      </div>
    </div>

    <dl class="m-0 grid grid-cols-2 gap-2.5 border-t border-line-soft pt-3">
      <div class="flex flex-col gap-0.5">
        <dt class="caps-label font-normal">Distance</dt>
        <dd class="m-0 text-base font-bold">{{ formatDistance(school.distanceKm, hasPostal) }}</dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="caps-label font-normal">{{ getTier(school.tier).benchmarkLabel }}</dt>
        <dd class="m-0 text-base font-bold text-primary">{{ formatLatestBenchmark(school) }}</dd>
      </div>
    </dl>

    <BaseButton
      variant="outline-danger"
      size="sm"
      class="self-start"
      :aria-label="`Remove ${school.name}`"
      @click="$emit('remove')"
    >
      Remove
    </BaseButton>
  </article>
</template>
