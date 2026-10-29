import type { RouteLocationRaw } from 'vue-router'
import type { DirectoryTierId, TierId } from '@/types/school'

/** A stop on the home page route: one stage of a student's education. */
export interface RouteStop {
  id: string
  name: string
  /** The level the student is preparing for from this stop. The last stop leads nowhere. */
  next?: TierId
  /** The directory tier whose school count is shown under the stop. */
  tier?: DirectoryTierId
}

export const ROUTE_STOPS: RouteStop[] = [
  { id: 'start', name: 'Not in school yet', next: 'preschool' },
  { id: 'preschool', name: 'Preschool', next: 'primary' },
  { id: 'primary', name: 'Primary', next: 'secondary', tier: 'primary' },
  { id: 'secondary', name: 'Secondary', next: 'postsec', tier: 'secondary' },
  { id: 'postsec', name: 'Post-secondary', next: 'uni', tier: 'postsec' },
  { id: 'uni', name: 'University', tier: 'uni' },
]

/** The stop the route opens on for someone who has not told PathSG where they are. */
export const DEFAULT_STOP = 'primary'

/** Button text for browsing the schools a level leads to. */
export const BROWSE_LABELS: Record<DirectoryTierId, string> = {
  primary: 'Browse primary schools',
  secondary: 'Browse secondary schools',
  postsec: 'Browse post-secondary schools',
  uni: 'Browse universities',
}

export interface HomeFeature {
  title: string
  body: string
  to: RouteLocationRaw
}

export const HOME_FEATURES: HomeFeature[] = [
  {
    title: 'School profiles',
    body: 'Fees for citizens, permanent residents and international students, financial aid, scholarships, courses and past entry cut-offs, school by school.',
    to: { name: 'directory' },
  },
  {
    title: 'Distance from home',
    body: 'Enter a postal code and every school shows how far it is. Keep only the schools within 1, 2 or 5 km.',
    to: { name: 'directory' },
  },
  {
    title: 'Roadmaps',
    body: 'A rule-based plan appears at once, with an AI plan beside it to compare. Every plan comes with a map.',
    to: { name: 'roadmap' },
  },
  {
    title: 'Saved schools and reviews',
    body: 'Bookmark schools to compare later. Read what other families wrote, and add your own review once you have an account.',
    to: { name: 'saved' },
  },
]
