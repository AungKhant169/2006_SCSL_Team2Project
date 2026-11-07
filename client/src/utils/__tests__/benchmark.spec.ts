import { describe, expect, it } from 'vitest'
import { makeSchool } from '@/test/fixtures'
import type { BenchmarkSpec } from '@/types/school'
import {
  benchmarkBarPercent,
  formatBenchmark,
  formatLatestBenchmark,
  latestBenchmark,
} from '../benchmark'

const PLACES: BenchmarkSpec = { format: { kind: 'places' }, max: 400 }
const T_SCORE: BenchmarkSpec = { format: { kind: 'tScore' }, max: 300 }

const L1R5: BenchmarkSpec = {
  format: { kind: 'range', label: 'L1R5', digits: 0 },
  max: 20,
  inverse: true,
}
const GPA: BenchmarkSpec = { format: { kind: 'range', label: 'GPA', digits: 2 }, max: 4 }

describe('formatBenchmark', () => {
  it('renders the primary places taken', () => {
    expect(formatBenchmark(PLACES, 130)).toBe('130 places')
  })

  it('renders a range from its best figure to its cut-off', () => {
    expect(formatBenchmark(L1R5, 8, 5)).toBe('L1R5 5–8')
  })

  it('renders a single figure when the range is one value', () => {
    expect(formatBenchmark(L1R5, 8)).toBe('L1R5 8')
    expect(formatBenchmark(L1R5, 8, 8)).toBe('L1R5 8')
  })

  it('renders the percentiles of a GPA to two places', () => {
    expect(formatBenchmark(GPA, 3.9, 3.4)).toBe('GPA 3.40–3.90')
  })

  it('renders a PSLE T-score cut-off as a minimum', () => {
    expect(formatBenchmark(T_SCORE, 264)).toBe('T-score ≥ 264')
  })
})

describe('benchmarkBarPercent', () => {
  it('fills proportionally for normal scales', () => {
    expect(benchmarkBarPercent(T_SCORE, 225)).toBe(75)
  })

  it('never overflows the bar', () => {
    expect(benchmarkBarPercent(PLACES, 520)).toBe(100)
  })

  it('fills more as the value drops for inverse scales (lower = more selective)', () => {
    const spec: BenchmarkSpec = { ...T_SCORE, inverse: true }
    expect(benchmarkBarPercent(spec, 75)).toBe(75)
    expect(benchmarkBarPercent(spec, 60)).toBeGreaterThan(benchmarkBarPercent(spec, 160))
  })
})

describe('latest benchmark of a school', () => {
  const school = makeSchool({
    benchmark: T_SCORE,
    history: [
      { year: '2016', value: 250 },
      { year: '2017', value: 260 },
    ],
  })

  it('picks the most recent year', () => {
    expect(latestBenchmark(school)).toEqual({ year: '2017', value: 260 })
    expect(formatLatestBenchmark(school)).toBe('T-score ≥ 260')
  })

  it('shows the whole range of a latest figure that has one', () => {
    const jc = makeSchool({
      benchmark: L1R5,
      history: [
        { year: '2024', value: 9, low: 4 },
        { year: '2025', value: 8, low: 5 },
      ],
    })
    expect(formatLatestBenchmark(jc)).toBe('L1R5 5–8')
  })

  it('is empty for a school the dataset has no figures for', () => {
    const bare = makeSchool()
    expect(latestBenchmark(bare)).toBeUndefined()
    expect(formatLatestBenchmark(bare)).toBe('')
  })
})
