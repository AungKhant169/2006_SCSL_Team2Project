import { getTier } from '@/data/education'
import type { PlanNode } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { formatLatestBenchmark } from './benchmark'
import { choiceLabel } from './format'

/** Number of choices a generated roadmap lists. */
export const PLAN_LENGTH = 3

/**
 * What a school is known for in a plan. Its distance is left out: it is measured from the centre of
 * the postal district, which is too rough to show, and the map places the school.
 */
function describe(school: School, stage: TierId): string {
  const benchmark = formatLatestBenchmark(school)
  return benchmark ? `${getTier(stage).benchmarkLabel}: ${benchmark}` : ''
}

/**
 * Display nodes for school ids in preference order. A choice whose school is not in `schools`
 * (the school no longer exists) shows as not available.
 */
export function planNodes(
  choices: number[],
  schools: Record<number, School>,
  stage: TierId,
): PlanNode[] {
  return choices.map((id, i) => {
    const school = schools[id]
    return {
      step: i + 1,
      label: choiceLabel(i),
      schoolName: school ? school.name : 'Not available',
      detail: school ? describe(school, stage) : 'Not available',
      latitude: school?.latitude ?? null,
      longitude: school?.longitude ?? null,
    }
  })
}
