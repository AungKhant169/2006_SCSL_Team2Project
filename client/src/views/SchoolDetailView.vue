<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import ReviewSection from '@/components/reviews/ReviewSection.vue'
import BenchmarkHistory from '@/components/schools/BenchmarkHistory.vue'
import FeeTable from '@/components/schools/FeeTable.vue'
import FinancialSupport from '@/components/schools/FinancialSupport.vue'
import SchoolIdentityCard from '@/components/schools/SchoolIdentityCard.vue'
import SchoolLocationCard from '@/components/schools/SchoolLocationCard.vue'
import SchoolProgrammes from '@/components/schools/SchoolProgrammes.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { fetchSchoolProfile } from '@/services/schoolService'
import { useDirectoryStore } from '@/stores/directory'
import { useLocationStore } from '@/stores/location'
import type { SchoolProfile } from '@/types/school'

const props = defineProps<{ schoolKey: string }>()

const directory = useDirectoryStore()
const location = useLocationStore()

const profile = shallowRef<SchoolProfile | null>(null)
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
/** Identifies the latest request so a slow one for a school already left cannot replace the page. */
let run = 0

async function load() {
  const current = ++run
  status.value = 'loading'
  try {
    const found = await fetchSchoolProfile(props.schoolKey)
    if (current !== run) return
    profile.value = found
    status.value = found ? 'ready' : 'missing'
  } catch {
    if (current !== run) return
    status.value = 'error'
  }
}

watch(() => props.schoolKey, load, { immediate: true })

/** The profile with its distance from the directory's reference postal code. */
const school = computed(() =>
  profile.value ? location.withDistance(profile.value, directory.postal) : null,
)

/** Where that reference postal code is, for the map. */
const origin = computed(() => location.originOf(directory.postal))
</script>

<template>
  <div v-if="status === 'ready' && school" class="page">
    <RouterLink :to="{ name: 'directory' }" class="text-[13px] font-semibold">
      ← Back to directory
    </RouterLink>

    <SchoolIdentityCard :school="school" />

    <SchoolLocationCard :school="school" :origin="origin" :postal="directory.postal" />

    <FeeTable :school="school" />

    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
      <BenchmarkHistory :school="school" />
      <FinancialSupport :school="school" />
    </div>

    <SchoolProgrammes :school="school" />

    <!-- Keyed so draft text and edit mode never leak from one school to the next. -->
    <ReviewSection :key="school.id" :school-id="school.id" />
  </div>

  <div v-else-if="status === 'loading'" class="page">
    <div class="flex items-center justify-center gap-3 py-10 text-sm text-muted" role="status">
      <SpinnerIcon />
      Loading school…
    </div>
  </div>

  <div v-else-if="status === 'error'" class="page">
    <div class="flex flex-col items-start gap-3">
      <AlertMessage>Unable to load this school at this time. Please try again.</AlertMessage>
      <BaseButton variant="outline" @click="load()">Try again</BaseButton>
    </div>
  </div>

  <div v-else class="page">
    <EmptyState title="School not found" message="This school is not in the directory.">
      <LinkButton :to="{ name: 'directory' }">Back to directory</LinkButton>
    </EmptyState>
  </div>
</template>
