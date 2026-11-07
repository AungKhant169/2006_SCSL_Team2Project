<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { getTier } from '@/data/education'
import type { BenchmarkPoint, BenchmarkSeries, BenchmarkSpec, School } from '@/types/school'
import { benchmarkBarPercent, formatBenchmark } from '@/utils/benchmark'

/** A school from the directory has the figure of its tier; a profile also has the yearly series. */
const props = defineProps<{ school: School & { benchmarks?: BenchmarkSeries[] } }>()

interface Block {
  key: string
  /** What the figure is, for every block after the one of the school's tier. */
  title?: string
  description?: string
  rows: { year: string; value: string; percent: number }[]
  latest: { year: string; value: string }
}

function block(
  key: string,
  spec: BenchmarkSpec,
  points: BenchmarkPoint[],
  about?: { title: string; description: string },
): Block[] {
  if (points.length === 0) return []
  const rows = points.map((point) => ({
    year: point.year,
    value: formatBenchmark(spec, point.value, point.low),
    percent: benchmarkBarPercent(spec, point.value),
  }))
  const last = rows[rows.length - 1]!
  return [{ key, ...about, rows, latest: { year: last.year, value: last.value } }]
}

const blocks = computed<Block[]>(() => {
  const { benchmark, history, benchmarks = [] } = props.school
  return [
    ...(benchmark ? block('tier', benchmark, history) : []),
    ...benchmarks.flatMap((series) => block(series.measure, series.spec, series.points, series)),
  ]
})
</script>

<template>
  <SectionCard
    title="Historical entry benchmarks"
    title-size="lg"
    :hint="getTier(school.tier).benchmarkDescription"
  >
    <p v-if="blocks.length === 0" class="m-0 text-sm text-muted">Not available</p>
    <section v-for="item in blocks" :key="item.key" class="flex flex-col gap-2.5">
      <div v-if="item.title" class="flex flex-col gap-0.5">
        <h3 class="m-0 text-[13px] font-bold text-ink">{{ item.title }}</h3>
        <p class="m-0 text-xs text-muted">{{ item.description }}</p>
      </div>
      <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
        <li
          v-for="row in item.rows"
          :key="row.year"
          class="grid grid-cols-[56px_1fr_minmax(110px,auto)] items-center gap-3 text-[13px]"
        >
          <span class="text-muted">{{ row.year }}</span>
          <div class="h-2.5 overflow-hidden rounded-[5px] bg-chip" aria-hidden="true">
            <div class="h-full rounded-[5px] bg-primary" :style="{ width: `${row.percent}%` }" />
          </div>
          <span class="text-right font-semibold">{{ row.value }}</span>
        </li>
      </ul>
      <div class="flex justify-between border-t border-line-soft pt-3 text-[13px]">
        <span class="text-muted">Latest ({{ item.latest.year }})</span>
        <span class="font-bold text-primary">{{ item.latest.value }}</span>
      </div>
    </section>
  </SectionCard>
</template>
