import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { useDirectoryStore } from '../directory'
import { useProfileStore } from '../profile'

describe('profile store (UC-2.4)', () => {
  let api: FakeApi

  beforeEach(async () => {
    setActivePinia(createPinia())
    api = stubApi()
  })

  it('starts with an empty profile aiming at secondary school', () => {
    const p = useProfileStore()
    expect([p.level, p.scoreA, p.scoreB, p.postal]).toEqual(['secondary', '', '', ''])
    expect(p.postalValid).toBe(false)
    expect(p.levelInfo.label).toBe('S1 Posting')
  })

  describe('load', () => {
    it('fills the form from the stored profile', async () => {
      api.profiles['planner2026'] = {
        level: 'postsec',
        score_a: 12,
        score_b: 9,
        postal: '119077',
        primary_result: 'None',
      }
      const p = useProfileStore()
      await signInAs('planner2026')
      expect([p.level, p.scoreA, p.scoreB, p.postal]).toEqual(['postsec', '12', '9', '119077'])
      expect(p.postalValid).toBe(true)
      expect(p.error).toBe('')
    })

    it('leaves a new account’s form empty', async () => {
      const p = useProfileStore()
      await signInAs('planner2026')
      expect([p.level, p.scoreA, p.postal]).toEqual(['secondary', '', ''])
    })

    it('says so when the profile cannot be read', async () => {
      api.override('GET /profile', () => {
        throw new TypeError('Failed to fetch')
      })
      const p = useProfileStore()
      await p.load()
      expect(p.error).toMatch(/Unable to complete your request/)
    })
  })

  describe('target education level (REQ-2.6, REQ-2.7)', () => {
    it('clears the academic fields and messages that no longer apply', () => {
      const p = useProfileStore()
      p.error = 'old error'
      p.setLevel('uni')
      expect(p.level).toBe('uni')
      expect([p.scoreA, p.scoreB, p.error]).toEqual(['', '', ''])
    })

    it('gives the results back when the level is selected again', () => {
      const p = useProfileStore()
      p.scoreA = '12'
      p.setLevel('postsec')
      p.scoreA = '9'
      p.scoreB = '7'
      p.setLevel('secondary')
      expect([p.scoreA, p.scoreB]).toEqual(['12', ''])
      p.setLevel('postsec')
      expect([p.scoreA, p.scoreB]).toEqual(['9', '7'])
    })

    it('keeps everything when the current level is selected again', () => {
      const p = useProfileStore()
      p.scoreA = '12'
      p.error = 'old error'
      p.setLevel('secondary')
      expect([p.scoreA, p.error]).toEqual(['12', 'old error'])
    })

    it('keeps the saved results on a level the student only looked away from', async () => {
      api.profiles['planner2026'] = {
        level: 'postsec',
        score_a: 12,
        score_b: 9,
        postal: '119077',
        primary_result: 'None',
      }
      const p = useProfileStore()
      await signInAs('planner2026')
      p.setLevel('uni')
      expect([p.scoreA, p.scoreB]).toEqual(['', ''])
      p.setLevel('postsec')
      expect([p.scoreA, p.scoreB]).toEqual(['12', '9'])
    })

    it('exposes guidance for the selected level', () => {
      const p = useProfileStore()
      p.setLevel('postsec')
      expect(p.levelInfo.hint).toBe('Enter either or both O-Level aggregates.')
    })
  })

  describe('save', () => {
    beforeEach(async () => {
      await signInAs('planner2026')
    })

    it('stores a valid profile and makes the postal code the distance anchor', async () => {
      const p = useProfileStore()
      const directory = useDirectoryStore()
      p.setPostal('119077')
      p.scoreA = '12'
      expect(await p.save()).toBe(true)
      expect(p.error).toBe('')
      expect(directory.postal).toBe('119077')
      expect(api.profiles['planner2026']).toEqual({
        level: 'secondary',
        score_a: 12,
        score_b: null,
        postal: '119077',
        primary_result: 'None',
      })
    })

    it('blocks an out-of-range score with an inline message and sends nothing', async () => {
      const p = useProfileStore()
      p.setPostal('556000')
      p.scoreA = '35'
      expect(await p.save()).toBe(false)
      expect(p.error).toBe('Invalid academic score! PSLE AL must be a whole number from 4 to 32.')
      expect(api.callsTo('PUT /profile')).toHaveLength(0)
    })

    it('blocks an invalid postal code and leaves the directory anchor alone', async () => {
      const p = useProfileStore()
      const directory = useDirectoryStore()
      p.scoreA = '8'
      p.setPostal('12345')
      expect(await p.save()).toBe(false)
      expect(p.error).toBe('Please enter a valid 6-digit Singapore postal code.')
      expect(directory.postal).toBe('556000')
    })

    it('shows the server’s message when it refuses the profile', async () => {
      const p = useProfileStore()
      const directory = useDirectoryStore()
      p.setPostal('556000')
      p.scoreA = '8'
      api.override('PUT /profile', () =>
        Response.json(
          { detail: 'Please enter a valid 6-digit Singapore postal code.' },
          { status: 422 },
        ),
      )
      expect(await p.save()).toBe(false)
      expect(p.error).toBe('Please enter a valid 6-digit Singapore postal code.')
      expect(directory.postal).toBe('556000')
    })

    it('is busy only while the request is in flight', async () => {
      const p = useProfileStore()
      p.setPostal('556000')
      p.scoreA = '8'
      const release = api.hold('PUT /profile')
      const saving = p.save()
      expect(p.saving).toBe(true)
      release()
      await saving
      expect(p.saving).toBe(false)
    })

    it('editing a score afterwards clears the previous result', async () => {
      const p = useProfileStore()
      p.setPostal('556000')
      p.scoreA = '99'
      await p.save()
      expect(p.error).not.toBe('')
      p.scoreA = '10'
      expect(p.error).toBe('')
      expect(await p.save()).toBe(true)
    })
  })

  it('setPostal keeps digits only, capped at six', () => {
    const p = useProfileStore()
    p.setPostal('ab12-34 5678')
    expect(p.postal).toBe('123456')
  })

  it('reset empties the profile', async () => {
    const p = useProfileStore()
    p.setLevel('uni')
    p.setPostal('119077')
    p.primaryResult = 'Kindergarten completion'
    p.reset()
    expect([p.level, p.scoreA, p.postal, p.primaryResult]).toEqual(['secondary', '', '', 'None'])
    await flushPromises()
  })

  it('reset also forgets the results set aside for other levels', () => {
    const p = useProfileStore()
    p.setLevel('uni')
    p.scoreA = '3.5'
    p.setLevel('secondary')
    p.reset()
    p.setLevel('uni')
    expect(p.scoreA).toBe('')
  })
})
