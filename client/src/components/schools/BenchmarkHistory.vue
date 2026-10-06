<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { getTier } from '@/data/education'
import type { School } from '@/types/school'
import { benchmarkBarPercent, formatBenchmark, latestBenchmark } from '@/utils/benchmark'

const props = defineProps<{ school: School }>()

const rows = computed(() =>
  props.school.history.map((point) => ({
    year: point.year,
    value: formatBenchmark(props.school.benchmark, point.value),
    percent: benchmarkBarPercent(props.school.benchmark, point.value),
  })),
)
const latest = computed(() => latestBenchmark(props.school))
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
        class="grid grid-cols-[48px_1fr_110px] items-center gap-3 text-[13px]"
      >
        <span class="text-muted">{{ row.year }}</span>
        <div class="h-2.5 overflow-hidden rounded-[5px] bg-chip" aria-hidden="true">
          <div class="h-full rounded-[5px] bg-primary" :style="{ width: `${row.percent}%` }" />
        </div>
        <span class="text-right font-semibold">{{ row.value }}</span>
      </li>
    </ul>
    <div
      v-if="rows.length > 0"
      class="flex justify-between border-t border-line-soft pt-3 text-[13px]"
    >
      <span class="text-muted">Latest ({{ latest.year }})</span>
      <span class="font-bold text-primary">{{ rows.at(-1)?.value }}</span>
    </div>
  </SectionCard>
</template>
