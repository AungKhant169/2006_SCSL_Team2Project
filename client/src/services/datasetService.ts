import { adminOutcome } from './prototypeFlags'

export type DatasetFailure = 'timeout' | 'parse'

/** Raised when the dataset pipeline aborts; the existing records are left untouched. */
export class DatasetUpdateError extends Error {
  readonly kind: DatasetFailure

  constructor(kind: DatasetFailure) {
    super(kind === 'timeout' ? 'Unable to reach API.' : 'Unable to process dataset format.')
    this.name = 'DatasetUpdateError'
    this.kind = kind
  }
}

/** Simulated pipeline duration (PERF-8 allows up to ten seconds). */
const SIMULATED_DURATION_MS = 1800

/**
 * Stands in for the pipeline that fetches school data from data.gov.sg / OneMap, standardises
 * it and bulk-writes it in one transaction. Resolves on commit, rejects when the run aborts.
 */
export async function updateDataset(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DURATION_MS))
  const outcome = adminOutcome()
  if (outcome !== 'success') throw new DatasetUpdateError(outcome)
}
