<script setup lang="ts">
import PillBadge from '@/components/ui/PillBadge.vue'
import { getTier } from '@/data/education'
import type { School } from '@/types/school'
import { formatDistance } from '@/utils/format'
import BookmarkButton from './BookmarkButton.vue'
import SchoolLogo from './SchoolLogo.vue'

defineProps<{
  school: School
  hasPostal: boolean
}>()
</script>

<template>
  <section class="card flex flex-wrap items-start gap-[18px] p-[22px]">
    <SchoolLogo :school-id="school.id" :name="school.name" :acronym="school.acronym" size="lg" />

    <div class="flex flex-[1_1_300px] flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="m-0 text-2xl font-bold tracking-tight">{{ school.name }}</h1>
        <PillBadge size="lg">{{ school.acronym }}</PillBadge>
        <PillBadge size="lg">{{ school.type }}</PillBadge>
        <PillBadge size="lg" variant="primary">{{ getTier(school.tier).label }}</PillBadge>
      </div>

      <dl
        class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-2 text-sm text-soft"
      >
        <div>
          <dt class="font-bold text-ink">Address</dt>
          <dd class="m-0">{{ school.address }}, Singapore {{ school.postal }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Nearest MRT</dt>
          <dd class="m-0">{{ school.mrt }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Nearest bus stop</dt>
          <dd class="m-0">{{ school.bus }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Distance</dt>
          <dd class="m-0">{{ formatDistance(school.distanceKm, hasPostal) }}</dd>
        </div>
      </dl>
    </div>

    <BookmarkButton :school-id="school.id" size="md" class="shrink-0 self-start" />
  </section>
</template>
