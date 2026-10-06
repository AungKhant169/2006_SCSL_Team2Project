import type { BenchmarkPoint, BenchmarkSpec, School } from '@/types/school'

/** PSLE Achievement Level aggregates run from 4 (best) to 32. */
const PSLE_AL_BEST = 4

export function formatBenchmark(spec: BenchmarkSpec, value: number): string {
  const { format } = spec
  switch (format.kind) {
    case 'ratio':
      return `${value.toFixed(1)} : 1`
    case 'alRange':
      return `AL ${PSLE_AL_BEST} – ${value}`
    case 'cutoff':
      return `${format.scale} ≤ ${value}`
    case 'gpaRange':
      return `${value.toFixed(2)} – ${format.upper.toFixed(2)}`
  }
}

/** Width (0–100) of a history bar. Inverse scales fill more as the cut-off gets lower. */
export function benchmarkBarPercent(spec: BenchmarkSpec, value: number): number {
  const ratio = (value / spec.max) * 100
  return Math.round(spec.inverse ? 100 - ratio : ratio)
}

export function latestBenchmark(school: School): BenchmarkPoint {
  const latest = school.history[school.history.length - 1]
  if (!latest) throw new Error(`School ${school.id} has no benchmark history`)
  return latest
}

export function formatLatestBenchmark(school: School): string {
  return formatBenchmark(school.benchmark, latestBenchmark(school).value)
}
