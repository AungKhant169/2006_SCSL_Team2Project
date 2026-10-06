import { getTier } from '@/data/education'
import { getSchool, schoolsInTier } from '@/data/schools'
import type { PlanNode } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { formatLatestBenchmark, latestBenchmark } from './benchmark'
import { choiceLabel } from './format'

/** Number of choices a generated roadmap lists. */
export const PLAN_LENGTH = 3

/** Rule-based ordering: nearest institutions to the reference postal code first. */
export function ruleBasedOrder(pool: School[]): School[] {
  return pool.slice().sort((a, b) => a.distanceKm - b.distanceKm)
}

/** AI-style ordering: most selective benchmark first, ignoring distance. */
export function benchmarkOrder(pool: School[]): School[] {
  const latest = (s: School) => latestBenchmark(s).value
  return pool
    .slice()
    .sort((a, b) => (a.benchmark.inverse ? latest(a) - latest(b) : latest(b) - latest(a)))
}

/** Institutions that can appear in a roadmap for the given target stage. */
export function eligibleSchools(stage: TierId): School[] {
  return schoolsInTier(stage)
}

function describe(school: School, stage: TierId, postal: string): string {
  const tier = getTier(stage)
  return `${tier.benchmarkLabel}: ${formatLatestBenchmark(school)} · ${school.distanceKm.toFixed(1)} km from ${postal}`
}

export function toPlanNodes(order: School[], stage: TierId, postal: string): PlanNode[] {
  return order.slice(0, PLAN_LENGTH).map((school, i) => ({
    step: i + 1,
    label: choiceLabel(i),
    schoolName: school.name,
    detail: describe(school, stage, postal),
  }))
}

/** Rebuilds display nodes for a saved roadmap, tolerating choices that no longer exist. */
export function savedPlanNodes(choices: number[], stage: TierId, postal: string): PlanNode[] {
  return choices.map((id, i) => {
    const school = getSchool(id)
    return {
      step: i + 1,
      label: choiceLabel(i),
      schoolName: school ? school.name : 'Not available',
      detail: school ? describe(school, stage, postal) : 'Not available',
    }
  })
}
