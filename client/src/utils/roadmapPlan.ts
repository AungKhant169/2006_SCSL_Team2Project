import { getTier } from '@/data/education'
import type { PlanNode } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { formatLatestBenchmark } from './benchmark'
import { choiceLabel } from './format'

/** Number of choices a generated roadmap lists. */
export const PLAN_LENGTH = 3

function describe(school: School, stage: TierId, postal: string): string {
  const parts: string[] = []
  const benchmark = formatLatestBenchmark(school)
  if (benchmark) parts.push(`${getTier(stage).benchmarkLabel}: ${benchmark}`)
  parts.push(
    school.distanceKm === null
      ? 'Distance not available'
      : `${school.distanceKm.toFixed(1)} km from ${postal}`,
  )
  return parts.join(' · ')
}

/**
 * Display nodes for school ids in preference order. A choice whose school is not in `schools`
 * (the school no longer exists) shows as not available.
 */
export function planNodes(
  choices: number[],
  schools: Record<number, School>,
  stage: TierId,
  postal: string,
): PlanNode[] {
  return choices.map((id, i) => {
    const school = schools[id]
    return {
      step: i + 1,
      label: choiceLabel(i),
      schoolName: school ? school.name : 'Not available',
      detail: school ? describe(school, stage, postal) : 'Not available',
      latitude: school?.latitude ?? null,
      longitude: school?.longitude ?? null,
    }
  })
}
