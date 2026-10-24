<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { getTier } from '@/data/education'
import type { School } from '@/types/school'
import { benchmarkBarPercent, formatBenchmark } from '@/utils/benchmark'

const props = defineProps<{ school: School }>()

const rows = computed(() => {
  const { benchmark, history } = props.school
  if (!benchmark) return []
  return history.map((point) => ({
    year: point.year,
    value: formatBenchmark(benchmark, point.value),
    percent: benchmarkBarPercent(benchmark, point.value),
  }))
})
const latest = computed(() => props.school.history.at(-1))
</script>

<template>
  <SectionCard
    title="Historical entry benchmarks"
    title-size="lg"
    :hint="getTier(school.tier).benchmarkDescription"
  >
    <p v-if="rows.length === 0" class="m-0 text-sm text-muted">Not available</p>
    <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
      <li
        v-for="row in rows"
        :key="row.year"
        class="grid grid-cols-[56px_1fr_110px] items-center gap-3 text-[13px]"
      >
        <span class="text-muted">{{ row.year }}</span>
        <div class="h-2.5 overflow-hidden rounded-[5px] bg-chip" aria-hidden="true">
          <div class="h-full rounded-[5px] bg-primary" :style="{ width: `${row.percent}%` }" />
        </div>
        <span class="text-right font-semibold">{{ row.value }}</span>
      </li>
    </ul>
    <div
      v-if="rows.length > 0 && latest"
      class="flex justify-between border-t border-line-soft pt-3 text-[13px]"
    >
      <span class="text-muted">Latest ({{ latest.year }})</span>
      <span class="font-bold text-primary">{{ rows.at(-1)?.value }}</span>
    </div>
  </SectionCard>
</template>
