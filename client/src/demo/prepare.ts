import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useDirectoryStore } from '@/stores/directory'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import type { DemoStep } from './script'

/** Only called by a successfully paired display, never by a normal site visit. */
export async function prepareStep(step: DemoStep): Promise<string> {
  const directory = useDirectoryStore()
  if (step.student && !useAuthStore().loggedIn) {
    const bytes = crypto.getRandomValues(new Uint8Array(12))
    const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const failure = await useAuthStore().register(`Demo${suffix.slice(0, 16)}`, `P!${suffix}`)
    if (failure) throw new Error(`Cannot prepare the sample student: ${failure}`)
    const profile = useProfileStore()
    profile.setLevel('secondary')
    profile.setPostal('556000')
    profile.scoreA = '8'
    if (!(await profile.save())) throw new Error(`Cannot save the sample profile: ${profile.error}`)
    const schools = await directory.loadTier('primary')
    for (const school of schools.slice(0, 2)) await useBookmarksStore().toggle(school.id)
  }
  if (['directory', 'search', 'empty'].includes(step.prepare ?? '')) {
    directory.tier = 'primary'
    directory.resetFilters()
    directory.query =
      step.prepare === 'search' ? 'Rosyth' : step.prepare === 'empty' ? 'zzzzzzzz' : ''
    await directory.load()
  }
  if (step.route === 'school') {
    const schools = await directory.loadTier('primary')
    const school = schools.find((s) => /rosyth/i.test(s.name)) ?? schools[0]
    if (!school)
      throw new Error(
        'No primary schools are loaded. Import the school dataset, then press Refocus.',
      )
    return `/schools/${encodeURIComponent(school.key)}`
  }
  if (step.prepare === 'generate') {
    const roadmap = useRoadmapStore()
    // Warm the local catalogue before the reveal; demo AI never contacts the external model.
    if (roadmap.stage !== 'preschool') await directory.loadTier(roadmap.stage)
    if (!roadmap.generated && !roadmap.generate()) {
      throw new Error('Complete the student profile on the laptop, then press Refocus.')
    }
  }
  return step.route
}
