<script setup lang="ts">
import PillBadge from '@/components/ui/PillBadge.vue'
import { getTier } from '@/data/education'
import type { School } from '@/types/school'
import { formatLatestBenchmark } from '@/utils/benchmark'
import { formatDistance } from '@/utils/format'
import BookmarkButton from './BookmarkButton.vue'
import SchoolLogo from './SchoolLogo.vue'

defineProps<{
  school: School
  /** Whether a valid reference postal code is set, so distances can be shown. */
  hasPostal: boolean
}>()
</script>

<template>
  <article class="card card-interactive relative flex flex-wrap items-center gap-4 px-[18px] py-4">
    <SchoolLogo :school-id="school.id" :name="school.name" :acronym="school.acronym" />

    <div class="flex min-w-0 flex-[1_1_160px] flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- The link stretches over the whole card; the bookmark button sits above it. -->
        <RouterLink
          :to="{ name: 'school', params: { id: school.id } }"
          class="text-base font-bold text-ink after:absolute after:inset-0 after:content-[''] hover:text-ink hover:no-underline"
        >
          {{ school.name }}
        </RouterLink>
        <PillBadge>{{ school.acronym }}</PillBadge>
        <PillBadge>{{ school.type }}</PillBadge>
      </div>
      <span class="text-[13px] text-muted">
        {{ school.area }} · {{ school.postal }} · Nearest MRT: {{ school.mrt }}
      </span>
    </div>

    <div class="ml-auto flex shrink-0 items-center gap-4">
      <div class="flex flex-col items-end gap-1 whitespace-nowrap">
        <span class="text-xs text-muted">{{ getTier(school.tier).benchmarkLabel }}</span>
        <span class="text-[15px] font-bold text-primary">{{ formatLatestBenchmark(school) }}</span>
      </div>
      <div class="flex flex-col items-end gap-1.5 whitespace-nowrap">
        <span class="text-[13px] font-semibold">{{
          formatDistance(school.distanceKm, hasPostal)
        }}</span>
        <BookmarkButton :school-id="school.id" class="relative z-10" />
      </div>
    </div>
  </article>
</template>
