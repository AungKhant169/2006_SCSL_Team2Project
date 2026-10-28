import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { profileBlackBoxCases } from '@/test/profileBlackBoxCases'
import { useDirectoryStore } from '../directory'
import { useProfileStore } from '../profile'

describe('UserProfileController black-box save contract', () => {
  let api: FakeApi

  beforeEach(async () => {
    setActivePinia(createPinia())
    api = stubApi()
    await signInAs('planner2026')
    // A different pre-existing anchor makes preservation and replacement observable.
    useDirectoryStore().postal = '654321'
    api.profiles['planner2026'] = {
      level: 'secondary',
      score_a: 12,
      score_b: null,
      postal: '654321',
      primary_result: 'None',
    }
  })

  it.each(profileBlackBoxCases)('$id [$basis, $technique]', async ({ input, expectedError }) => {
    const profile = useProfileStore()
    const directory = useDirectoryStore()
    const previousProfile = { ...api.profiles['planner2026'] }
    // Exercise save() at its raw form-state boundary. setPostal() would filter invalid inputs.
    profile.$patch(input)

    const accepted = await profile.save()

    expect(accepted).toBe(expectedError === '')
    expect(profile.error).toBe(expectedError)
    expect(profile.saving).toBe(false)

    if (expectedError) {
      expect(api.callsTo('PUT /profile')).toHaveLength(0)
      expect(api.profiles['planner2026']).toEqual(previousProfile)
      expect(directory.postal).toBe('654321')
    } else {
      const payload = {
        level: input.level,
        score_a: input.scoreA === '' ? null : Number(input.scoreA),
        score_b: input.scoreB === '' ? null : Number(input.scoreB),
        postal: input.postal,
        primary_result: 'None',
      }
      expect(api.callsTo('PUT /profile')).toHaveLength(1)
      expect(api.callsTo('PUT /profile')[0]?.body).toEqual(payload)
      expect(api.profiles['planner2026']).toEqual(payload)
      expect(directory.postal).toBe(input.postal)
    }
  })
})
