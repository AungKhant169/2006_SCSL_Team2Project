import type { TierId } from '@/types/school'
import { benchmarkOrder, eligibleSchools } from '@/utils/roadmapPlan'
import { aiOutcome } from './prototypeFlags'

/** PERF-7 / REQ-3.7: the AI plan must arrive within five seconds or it is treated as failed. */
export const AI_TIMEOUT_MS = 5000

/** Simulated latency of the AI module. */
const SIMULATED_LATENCY_MS = 1600

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Stands in for the AI module: orders eligible institutions by benchmark fit. */
async function requestAiPlan(stage: TierId): Promise<number[]> {
  await delay(SIMULATED_LATENCY_MS)
  if (aiOutcome() === 'error') throw new Error('AI module unavailable')
  return benchmarkOrder(eligibleSchools(stage)).map((school) => school.id)
}

/** Resolves with school ids in preference order; rejects on error or after the timeout. */
export function generateAiPlan(stage: TierId): Promise<number[]> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI module timed out')), AI_TIMEOUT_MS)
  })
  return Promise.race([requestAiPlan(stage), timeout]).finally(() => clearTimeout(timer))
}
