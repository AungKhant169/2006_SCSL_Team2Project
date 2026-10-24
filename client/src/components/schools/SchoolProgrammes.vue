<script setup lang="ts">
import PillBadge from '@/components/ui/PillBadge.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import type { SchoolProfile } from '@/types/school'

defineProps<{ school: SchoolProfile }>()
</script>

<template>
  <SectionCard
    title="Programmes, subjects & CCAs"
    title-size="lg"
    hint="What the school offers, from the MOE school directory."
  >
    <section class="flex flex-col gap-2.5" aria-labelledby="programmes-heading">
      <h3 id="programmes-heading" class="section-title">Programmes</h3>
      <p
        v-if="school.programmes.length === 0 && school.moeProgrammes.length === 0"
        class="m-0 text-sm text-muted"
      >
        Not available
      </p>
      <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
        <li
          v-for="programme in school.programmes"
          :key="programme.kind"
          class="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2.5"
        >
          <span class="text-sm font-semibold">{{ programme.title }}</span>
          <span class="text-[13px] text-muted">
            {{ programme.kind
            }}<template v-if="programme.domain"> · {{ programme.domain }}</template>
          </span>
        </li>
        <li
          v-for="name in school.moeProgrammes"
          :key="name"
          class="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2.5"
        >
          <span class="text-sm font-semibold">{{ name }}</span>
          <span class="text-[13px] text-muted">MOE programme</span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5" aria-labelledby="subjects-heading">
      <h3 id="subjects-heading" class="section-title">
        Subjects <span class="font-medium text-muted">({{ school.subjects.length }})</span>
      </h3>
      <p v-if="school.subjects.length === 0" class="m-0 text-sm text-muted">Not available</p>
      <ul v-else class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="subject in school.subjects" :key="subject">
          <PillBadge>{{ subject }}</PillBadge>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5" aria-labelledby="ccas-heading">
      <h3 id="ccas-heading" class="section-title">Co-curricular activities</h3>
      <p v-if="school.ccas.length === 0" class="m-0 text-sm text-muted">Not available</p>
      <dl v-else class="m-0 flex flex-col gap-2.5">
        <div v-for="group in school.ccas" :key="group.category" class="flex flex-col gap-1">
          <dt class="caps-label">{{ group.category }}</dt>
          <dd class="m-0 text-[13px] text-soft">{{ group.names.join(' · ') }}</dd>
        </div>
      </dl>
    </section>
  </SectionCard>
</template>
