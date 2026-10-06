import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDirectoryStore } from '../directory'
import { useProfileStore } from '../profile'

describe('profile store (UC-2.4)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with the demo profile', () => {
    const p = useProfileStore()
    expect([p.level, p.scoreA, p.scoreB, p.postal]).toEqual(['secondary', '8', '', '556000'])
    expect(p.postalValid).toBe(true)
    expect(p.levelInfo.label).toBe('S1 Posting')
  })

  describe('target education level (REQ-2.6, REQ-2.7)', () => {
    it('clears the academic fields and messages that no longer apply', () => {
      const p = useProfileStore()
      p.error = 'old error'
      p.status = 'Profile saved'
      p.setLevel('uni')
      expect(p.level).toBe('uni')
      expect([p.scoreA, p.scoreB, p.error, p.status]).toEqual(['', '', '', ''])
    })

    it('exposes guidance for the selected level', () => {
      const p = useProfileStore()
      p.setLevel('postsec')
      expect(p.levelInfo.hint).toBe('Enter either or both O-Level aggregates.')
    })
  })

  describe('save', () => {
    it('stores a valid profile, confirms it and makes the postal code the distance anchor', () => {
      const p = useProfileStore()
      const directory = useDirectoryStore()
      p.setPostal('119077')
      p.scoreA = '12'
      expect(p.save()).toBe(true)
      expect(p.status).toBe('Profile saved')
      expect(p.error).toBe('')
      expect(directory.postal).toBe('119077')
    })

    it('blocks an out-of-range score with an inline message', () => {
      const p = useProfileStore()
      p.scoreA = '35'
      expect(p.save()).toBe(false)
      expect(p.error).toBe('Invalid academic score! PSLE AL must be a whole number from 4 to 32.')
      expect(p.status).toBe('')
    })

    it('blocks an invalid postal code and leaves the directory anchor alone', () => {
      const p = useProfileStore()
      const directory = useDirectoryStore()
      p.setPostal('12345')
      expect(p.save()).toBe(false)
      expect(p.error).toBe('Please enter a valid 6-digit Singapore postal code.')
      expect(directory.postal).toBe('556000')
    })

    it('editing a score afterwards clears the previous result', () => {
      const p = useProfileStore()
      p.scoreA = '99'
      p.save()
      expect(p.error).not.toBe('')
      p.scoreA = '10'
      expect(p.error).toBe('')
      p.save()
      expect(p.status).toBe('Profile saved')
      p.scoreA = '11'
      expect(p.status).toBe('')
    })

    it('editing the postal code clears the saved confirmation', () => {
      const p = useProfileStore()
      p.save()
      p.setPostal('556001')
      expect(p.status).toBe('')
    })
  })

  it('setPostal keeps digits only, capped at six', () => {
    const p = useProfileStore()
    p.setPostal('ab12-34 5678')
    expect(p.postal).toBe('123456')
  })

  it('reset restores the demo profile', () => {
    const p = useProfileStore()
    p.setLevel('uni')
    p.setPostal('119077')
    p.primaryResult = 'Kindergarten completion'
    p.reset()
    expect([p.level, p.scoreA, p.postal, p.primaryResult]).toEqual([
      'secondary',
      '8',
      '556000',
      'None',
    ])
  })
})
