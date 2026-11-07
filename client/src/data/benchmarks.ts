import type { BenchmarkMeasure, BenchmarkSpec } from '@/types/school'

interface BenchmarkInfo {
  title: string
  description: string
  spec: BenchmarkSpec
}

/** Every entry figure the benchmarks dataset can hold, in the order a school profile lists them. */
export const BENCHMARK_MEASURES: readonly BenchmarkMeasure[] = ['L1R5', 'ELR2B2', 'GPA', 'PSLE_AL']

export const BENCHMARKS: Record<BenchmarkMeasure, BenchmarkInfo> = {
  L1R5: {
    title: 'JAE cut-off (L1R5)',
    description:
      'Net L1R5 of the students admitted to the junior college through the JAE, from the best to ' +
      'the cut-off. A lower figure is more selective.',
    spec: { format: { kind: 'range', label: 'L1R5', digits: 0 }, max: 20, inverse: true },
  },
  ELR2B2: {
    title: 'JAE cut-off (ELR2B2)',
    description:
      'Net ELR2B2 of the students admitted through the JAE, from the best to the cut-off. A ' +
      'lower figure is more selective.',
    spec: { format: { kind: 'range', label: 'ELR2B2', digits: 0 }, max: 26, inverse: true },
  },
  GPA: {
    title: 'Admitted GPA (10th–90th percentile)',
    description: 'Grade point average of the 10th and 90th percentile of the students admitted.',
    spec: { format: { kind: 'range', label: 'GPA', digits: 2 }, max: 4 },
  },
  PSLE_AL: {
    title: 'PSLE AL range',
    description:
      'PSLE AL scores of the students posted to the school, from the best to the cut-off. A ' +
      'lower score is more selective.',
    spec: { format: { kind: 'range', label: 'AL', digits: 0 }, max: 32, inverse: true },
  },
}
