import type { Review } from '@/types/review'

/** Example reviews shown until the backend exposes a reviews endpoint. */
export const SEED_REVIEWS: Review[] = [
  {
    id: 101,
    schoolId: 2,
    username: 'eastsideparent',
    createdAt: '2026-09-09T21:14:00',
    text: 'Strong Chinese programme and a very active parent support group. Morning drop-off along Serangoon North gets congested before 7.15am, so plan for the shuttle bus.',
  },
  {
    id: 102,
    schoolId: 2,
    username: 'kaiyi88',
    createdAt: '2026-09-02T07:40:00',
    text: 'Teachers respond quickly on the parent portal. CCA options are broad for a school this size — my daughter joined robotics in P3.',
  },
  {
    id: 103,
    schoolId: 9,
    username: 'dipstudent24',
    createdAt: '2026-09-11T16:02:00',
    text: 'Computer science diploma is demanding but the internship placements are genuine industry roles. Library is open late during project season.',
  },
  {
    id: 104,
    schoolId: 14,
    username: 'polytouni',
    createdAt: '2026-09-10T11:26:00',
    text: 'Came in from a polytechnic GPA of 3.8. Module bidding takes some getting used to, and the Kent Ridge shuttle is essential between faculties.',
  },
]
