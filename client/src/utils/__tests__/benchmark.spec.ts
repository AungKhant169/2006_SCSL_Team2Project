import { describe, expect, it } from 'vitest'
import { getSchool } from '@/data/schools'
import type { BenchmarkSpec } from '@/types/school'
import {
  benchmarkBarPercent,
  formatBenchmark,
  formatLatestBenchmark,
  latestBenchmark,
} from '../benchmark'

describe('formatBenchmark', () => {
  it('renders the primary Phase 2C ratio', () => {
    expect(formatBenchmark({ format: { kind: 'ratio' }, max: 4 }, 3)).toBe('3.0 : 1')
  })

  it('renders PSLE AL ranges from the best score of 4', () => {
    expect(formatBenchmark({ format: { kind: 'alRange' }, max: 32 }, 6)).toBe('AL 4 – 6')
  })

  it('renders JAE cut-offs with their scale', () => {
    const l1r5: BenchmarkSpec = { format: { kind: 'cutoff', scale: 'L1R5' }, max: 20 }
    const elr2b2: BenchmarkSpec = { format: { kind: 'cutoff', scale: 'ELR2B2' }, max: 30 }
    expect(formatBenchmark(l1r5, 5)).toBe('L1R5 ≤ 5')
    expect(formatBenchmark(elr2b2, 9)).toBe('ELR2B2 ≤ 9')
  })

  it('renders GPA bands to two decimals', () => {
    expect(formatBenchmark({ format: { kind: 'gpaRange', upper: 4 }, max: 4 }, 3.9)).toBe(
      '3.90 – 4.00',
    )
  })
})

describe('benchmarkBarPercent', () => {
  it('fills proportionally for normal scales', () => {
    expect(benchmarkBarPercent({ format: { kind: 'ratio' }, max: 4 }, 3)).toBe(75)
  })

  it('fills more as the value drops for inverse scales (lower = more selective)', () => {
    const spec: BenchmarkSpec = { format: { kind: 'alRange' }, max: 32, inverse: true }
    expect(benchmarkBarPercent(spec, 8)).toBe(75)
    expect(benchmarkBarPercent(spec, 6)).toBeGreaterThan(benchmarkBarPercent(spec, 16))
  })
})

describe('latest benchmark of a school', () => {
  it('picks the most recent year', () => {
    const rosyth = getSchool(2)!
    expect(latestBenchmark(rosyth)).toEqual({ year: '2025', value: 2.4 })
    expect(formatLatestBenchmark(rosyth)).toBe('2.4 : 1')
  })

  it('formats university IGP bands with the school-specific upper bound', () => {
    expect(formatLatestBenchmark(getSchool(14)!)).toBe('3.90 – 4.00')
    expect(formatLatestBenchmark(getSchool(15)!)).toBe('3.75 – 3.98')
  })
})
