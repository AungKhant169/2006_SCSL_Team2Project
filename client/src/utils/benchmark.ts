import type { BenchmarkSpec, School } from '@/types/school'

/** A figure as text; `low` is the other end of a range, shown as "low–value". */
export function formatBenchmark(spec: BenchmarkSpec, value: number, low?: number): string {
  const { format } = spec
  switch (format.kind) {
    case 'places':
      return `${value} places`
    case 'tScore':
      return `T-score ≥ ${value}`
    case 'range': {
      const text = (figure: number) => figure.toFixed(format.digits)
      const range = low === undefined || low === value ? text(value) : `${text(low)}–${text(value)}`
      return `${format.label} ${range}`
    }
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
  return school.benchmark && latest
    ? formatBenchmark(school.benchmark, latest.value, latest.low)
    : ''
}
