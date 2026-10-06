<script setup lang="ts">
import PillBadge from '@/components/ui/PillBadge.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import type { School } from '@/types/school'

defineProps<{ school: School }>()
</script>

<template>
  <SectionCard class="gap-4">
    <section class="flex flex-col gap-2.5" aria-labelledby="aid-heading">
      <h2 id="aid-heading" class="section-title-lg">Financial assistance</h2>
      <p v-if="school.aid.length === 0" class="m-0 text-sm text-muted">Not available</p>
      <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
        <li
          v-for="aid in school.aid"
          :key="aid.name"
          class="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2.5"
        >
          <span class="text-sm font-semibold">{{ aid.name }}</span>
          <span class="text-[13px] text-muted">{{ aid.note }}</span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5" aria-labelledby="scholarship-heading">
      <h2 id="scholarship-heading" class="section-title-lg">Scholarships</h2>
      <p v-if="school.scholarships.length === 0" class="m-0 text-sm text-muted">Not available</p>
      <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
        <li
          v-for="scholarship in school.scholarships"
          :key="scholarship.name"
          class="flex flex-col gap-1 rounded-lg border border-line-soft px-3 py-2.5"
        >
          <div class="flex flex-wrap justify-between gap-2">
            <span class="text-sm font-semibold">{{ scholarship.name }}</span>
            <PillBadge>{{ scholarship.source }}</PillBadge>
          </div>
          <span class="text-[13px] text-muted">
            <b class="text-soft">Eligibility:</b> {{ scholarship.eligibility }}
          </span>
        </li>
      </ul>
    </section>
  </SectionCard>
</template>
