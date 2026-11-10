import type { RoadmapPlan } from '@/services/roadmapService'
import type { School, TierId } from '@/types/school'

const PREFERRED: Partial<Record<TierId, string[]>> = {
  primary: ['Rosyth School', 'Ai Tong School', 'Anderson Primary School'],
  secondary: [
    'Xinmin Secondary School',
    "Holy Innocents' High School",
    'Montfort Secondary School',
  ],
  postsec: ['Nanyang Polytechnic', 'Temasek Polytechnic', 'Singapore Polytechnic'],
  uni: [
    'Nanyang Technological University',
    'National University of Singapore',
    'Singapore Management University',
  ],
}

/** Fixed presentation ordering, using real catalogue IDs so maps and saving still work. No AI call. */
export function sampleAiPlan(stage: TierId, catalogue: School[]): RoadmapPlan {
  const names = PREFERRED[stage] ?? []
  const rank = (name: string) => {
    const index = names.indexOf(name)
    return index < 0 ? names.length : index
  }
  const schools = catalogue
    .filter((school) => school.tier === stage)
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
    .slice(0, 3)
  return { choices: schools.map((school) => school.id), schools }
}
