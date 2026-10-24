<script setup lang="ts">
import { computed, onMounted } from 'vue'
import NoSchoolsFound from '@/components/schools/NoSchoolsFound.vue'
import PaginationBar from '@/components/schools/PaginationBar.vue'
import SchoolFilterBar from '@/components/schools/SchoolFilterBar.vue'
import SchoolSummaryCard from '@/components/schools/SchoolSummaryCard.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { DIRECTORY_TIERS, getTier, SORT_OPTIONS } from '@/data/education'
import { useDirectoryStore } from '@/stores/directory'
import { pluralize } from '@/utils/format'

const directory = useDirectoryStore()

const tierOptions = DIRECTORY_TIERS.map((t) => ({ value: t.id, label: t.label }))
const tierLabel = computed(() => getTier(directory.tier).label)
const total = computed(() => directory.matches.length)

onMounted(() => directory.load())
</script>

<template>
  <div class="page">
    <PageHeader
      title="School Directory"
      subtitle="Institutional profiles and entry benchmarks across Singapore. Data: MOE via Data.gov.sg, OneMap."
    >
      <SegmentedControl
        v-model="directory.tier"
        :options="tierOptions"
        variant="outlined"
        label="Education tier"
      />
    </PageHeader>

    <SchoolFilterBar />

    <div
      v-if="directory.status === 'loading'"
      class="flex items-center justify-center gap-3 py-10 text-sm text-muted"
      role="status"
    >
      <SpinnerIcon />
      Loading schools…
    </div>

    <div v-else-if="directory.status === 'error'" class="flex flex-col items-start gap-3">
      <AlertMessage>
        Unable to load the {{ tierLabel }} schools at this time. Please try again.
      </AlertMessage>
      <BaseButton variant="outline" @click="directory.load()">Try again</BaseButton>
    </div>

    <EmptyState
      v-else-if="directory.tierEmpty"
      :title="`No ${tierLabel} schools yet`"
      message="The school dataset has no schools in this tier. Try another tier."
    />

    <div v-else class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm text-muted" data-testid="result-count">
          <b class="text-ink">{{ total }}</b> {{ pluralize(total, 'school') }} · {{ tierLabel }}
        </span>
        <label class="flex items-center gap-2 text-[13px] text-muted">
          Sort
          <BaseSelect v-model="directory.sort" class="w-auto py-1.5" :options="SORT_OPTIONS" />
        </label>
      </div>

      <template v-if="total > 0">
        <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
          <li v-for="school in directory.results" :key="school.id">
            <SchoolSummaryCard :school="school" />
          </li>
        </ul>
        <PaginationBar
          :page="directory.currentPage"
          :page-count="directory.pageCount"
          @previous="directory.previousPage()"
          @next="directory.nextPage()"
        />
      </template>
      <NoSchoolsFound v-else @reset="directory.resetFilters()" />
    </div>
  </div>
</template>
