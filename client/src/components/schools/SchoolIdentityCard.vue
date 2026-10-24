<script setup lang="ts">
import PillBadge from '@/components/ui/PillBadge.vue'
import { getTier } from '@/data/education'
import type { SchoolProfile } from '@/types/school'
import { formatDistance } from '@/utils/format'
import BookmarkButton from './BookmarkButton.vue'
import SchoolLogo from './SchoolLogo.vue'

defineProps<{ school: SchoolProfile }>()

const NOT_AVAILABLE = 'Not available'

/** Only web addresses become links: the field comes from an uploaded file. */
const isWebAddress = (url: string) => /^https?:\/\//i.test(url)
</script>

<template>
  <section class="card flex flex-wrap items-start gap-[18px] p-[22px]">
    <SchoolLogo :school-key="school.key" :name="school.name" :acronym="school.acronym" size="lg" />

    <div class="flex flex-[1_1_300px] flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="m-0 text-2xl font-bold tracking-tight">{{ school.name }}</h1>
        <PillBadge v-if="school.type" size="lg">{{ school.type }}</PillBadge>
        <PillBadge size="lg" variant="primary">{{ getTier(school.tier).label }}</PillBadge>
      </div>

      <ul v-if="school.features.length > 0" class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="feature in school.features" :key="feature">
          <PillBadge>{{ feature }}</PillBadge>
        </li>
      </ul>

      <dl
        class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-2 text-sm text-soft"
      >
        <div>
          <dt class="font-bold text-ink">Address</dt>
          <dd class="m-0">
            <template v-if="school.address">
              {{ school.address
              }}<template v-if="school.postal">, Singapore {{ school.postal }}</template>
            </template>
            <template v-else>{{ NOT_AVAILABLE }}</template>
          </dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Nearest MRT</dt>
          <dd class="m-0">{{ school.mrt || NOT_AVAILABLE }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Bus services</dt>
          <dd class="m-0">{{ school.bus || NOT_AVAILABLE }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Distance</dt>
          <dd class="m-0">{{ formatDistance(school.distanceKm) }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Principal</dt>
          <dd class="m-0">{{ school.principal || NOT_AVAILABLE }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Telephone</dt>
          <dd class="m-0">{{ school.phone || NOT_AVAILABLE }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Email</dt>
          <dd class="m-0 break-all">{{ school.email || NOT_AVAILABLE }}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Website</dt>
          <dd class="m-0 break-all">
            <a
              v-if="isWebAddress(school.website)"
              :href="school.website"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ school.website }}
            </a>
            <template v-else>{{ school.website || NOT_AVAILABLE }}</template>
          </dd>
        </div>
      </dl>
    </div>

    <BookmarkButton :school-id="school.id" size="md" class="shrink-0 self-start" />
  </section>
</template>
