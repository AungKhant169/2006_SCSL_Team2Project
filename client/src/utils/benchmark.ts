import type { BenchmarkSpec, School } from '@/types/school'

export function formatBenchmark(spec: BenchmarkSpec, value: number): string {
  const { format } = spec
  switch (format.kind) {
    case 'places':
      return `${value} places`
    case 'tScore':
      return `T-score ≥ ${value}`
  }
}

/** Width (0–100) of a history bar. Inverse scales fill more as the cut-off gets lower. */
export function benchmarkBarPercent(spec: BenchmarkSpec, value: number): number {
  const ratio = Math.min(100, (value / spec.max) * 100)
  return Math.round(spec.inverse ? 100 - ratio : ratio)
}

/** The school's most recent benchmark figure, or undefined when the dataset has none. */
export function latestBenchmark(school: School) {
  return school.history[school.history.length - 1]
}

/** The latest figure ready to show, or an empty string when there is none. */
export function formatLatestBenchmark(school: School): string {
  const latest = latestBenchmark(school)
  return school.benchmark && latest ? formatBenchmark(school.benchmark, latest.value) : ''
}
