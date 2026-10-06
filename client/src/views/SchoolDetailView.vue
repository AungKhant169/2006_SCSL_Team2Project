<script setup lang="ts">
import { computed } from 'vue'
import ReviewSection from '@/components/reviews/ReviewSection.vue'
import BenchmarkHistory from '@/components/schools/BenchmarkHistory.vue'
import FeeTable from '@/components/schools/FeeTable.vue'
import FinancialSupport from '@/components/schools/FinancialSupport.vue'
import SchoolIdentityCard from '@/components/schools/SchoolIdentityCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import { getSchool } from '@/data/schools'
import { useDirectoryStore } from '@/stores/directory'

const props = defineProps<{ id: string }>()

const directory = useDirectoryStore()
const school = computed(() => getSchool(Number(props.id)))
</script>

<template>
  <div v-if="school" class="page">
    <RouterLink :to="{ name: 'directory' }" class="text-[13px] font-semibold">
      ← Back to directory
    </RouterLink>

    <SchoolIdentityCard :school="school" :has-postal="directory.hasPostal" />

    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
      <FeeTable :school="school" class="col-span-full" />
      <BenchmarkHistory :school="school" />
      <FinancialSupport :school="school" />
    </div>

    <!-- Keyed so draft text and edit mode never leak from one school to the next. -->
    <ReviewSection :key="school.id" :school-id="school.id" />
  </div>

  <div v-else class="page">
    <EmptyState title="School not found" message="This school is not in the directory.">
      <LinkButton :to="{ name: 'directory' }">Back to directory</LinkButton>
    </EmptyState>
  </div>
</template>
