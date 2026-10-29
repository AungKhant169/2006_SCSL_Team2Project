import type { RuleSort } from '@/types/roadmap'
import type { TierId } from '@/types/school'

export const RULE_SORT_OPTIONS: { value: RuleSort; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'grade', label: 'Grade' },
]

/** What the rule set of each stage can rank by. A stage without a rule set has no choice to make. */
export const RULE_SORTS: Record<TierId, readonly RuleSort[]> = {
  preschool: [],
  primary: ['distance'],
  secondary: ['distance', 'grade'],
  postsec: ['distance', 'grade'],
  uni: [],
}

/** The acceptable-distance slider, in km. Its top end means any distance. */
export const DISTANCE_LIMIT = { min: 1, max: 20, step: 1 } as const

/** The slider's value as the limit it stands for, or null when it is at the top end. */
export function distanceLimitKm(value: number): number | null {
  return value < DISTANCE_LIMIT.max ? value : null
}

export function describeDistanceLimit(value: number): string {
  return distanceLimitKm(value) === null ? 'Any distance' : `Within ${value} km`
}

/** How the plan is ranked, for the About dialog. */
export const RULE_ABOUT = {
  weights: [
    { sort: 'Distance', distance: '100%', grade: '0%' },
    { sort: 'Grade', distance: 'Tie-breaker', grade: '100%' },
  ],
  distance:
    'Schools are ordered by straight-line distance, nearest first, and your score is not used. ' +
    'The distance is measured from the centre of your postal district (the first two digits of ' +
    'your postal code), not from your address, so it is only a guide. A school with no known ' +
    'position comes last. The map shows where each school is.',
  grade: {
    secondary:
      'Your PSLE AL score (4 best to 32) becomes a strength from 0 to 1: (32 − AL) ÷ 28. Each ' +
      'school’s 2017 PSLE T-score cut-off is scaled the same way across every school of the ' +
      'stage, the lowest cut-off being 0 and the highest 1. A school is within reach when your ' +
      'strength is at least its scaled cut-off. Schools within reach come first, then schools ' +
      'with no cut-off on record, then schools out of reach, the closest to reach first. ' +
      'Schools that fit equally well are ordered by distance. Without a score, every school ' +
      'counts as within reach.',
    postsec:
      'The dataset has no admission cut-offs for post-secondary institutions, so your score is ' +
      'not used. Schools are ordered by the number of subjects they offer, then the number of ' +
      'CCAs, and those that tie are ordered by distance.',
  } as Partial<Record<TierId, string>>,
  noGrade:
    'This stage has no grade to rank by: P1 registration does not use a score. Schools are ' +
    'ordered by distance.',
  limit:
    'Under Grade, the slider sets the furthest a school may be from your postal district. ' +
    'Schools beyond it, and schools with no known position, are left out before ranking. At ' +
    'the top end, Any distance, no school is left out.',
}
