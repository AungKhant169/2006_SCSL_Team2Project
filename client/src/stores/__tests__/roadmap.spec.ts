import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { generateAiPlan } from '@/services/roadmapAiService'
import { useProfileStore } from '../profile'
import { useRoadmapStore } from '../roadmap'

vi.mock('@/services/roadmapAiService', () => ({ generateAiPlan: vi.fn() }))

const aiPlan = vi.mocked(generateAiPlan)

/** A promise the test settles by hand, to observe the loading state in between. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('roadmap store (UC-3.1 to UC-3.4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    aiPlan.mockReset()
    aiPlan.mockResolvedValue([6, 5, 8, 7])
  })

  describe('stage selection', () => {
    it('follows the profile target level until another stage is chosen', () => {
      const profile = useProfileStore()
      const r = useRoadmapStore()
      expect(r.stage).toBe('secondary')
      r.selectStage('uni')
      expect(r.stage).toBe('uni')
      profile.setLevel('postsec')
      expect(r.stage).toBe('postsec')
    })

    it('choosing a stage discards a generated plan', async () => {
      const r = useRoadmapStore()
      r.generate()
      await flush()
      r.selectStage('primary')
      expect(r.generated).toBe(false)
      expect(r.aiStatus).toBe('idle')
    })
  })

  describe('generate', () => {
    it('is blocked without a valid postal code and starts nothing (REQ-3.12)', () => {
      const profile = useProfileStore()
      const r = useRoadmapStore()
      profile.setPostal('123')
      expect(r.generate()).toBe(false)
      expect(r.generated).toBe(false)
      expect(aiPlan).not.toHaveBeenCalled()
    })

    it('shows the rule-based plan immediately while the AI plan loads (REQ-3.1, QUAL-6)', () => {
      const pending = deferred<number[]>()
      aiPlan.mockReturnValue(pending.promise)
      const r = useRoadmapStore()
      expect(r.generate()).toBe(true)
      expect(r.generated).toBe(true)
      expect(r.aiStatus).toBe('loading')
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        "St. Gabriel's Secondary School",
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(r.aiPlan).toEqual([])
    })

    it('fills the AI plan when it arrives', async () => {
      const r = useRoadmapStore()
      r.generate()
      await flush()
      expect(aiPlan).toHaveBeenCalledWith('secondary')
      expect(r.aiStatus).toBe('ready')
      expect(r.aiPlan.map((n) => n.schoolName)).toEqual([
        "Cedar Girls' Secondary School",
        'Raffles Institution',
        "St. Gabriel's Secondary School",
      ])
    })

    it('uses rule sets specific to the chosen stage (REQ-3.2)', () => {
      const r = useRoadmapStore()
      r.selectStage('uni')
      r.generate()
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        'Kaplan Higher Education (Private)',
        'Singapore Management University',
        'National University of Singapore',
      ])
      expect(r.rulePlan[0]?.detail).toContain('IGP GPA (10th–90th)')
    })

    it('has no institutions to plan with for preschool yet', () => {
      const r = useRoadmapStore()
      r.selectStage('preschool')
      r.generate()
      expect(r.rulePlan).toEqual([])
    })
  })

  describe('AI fault isolation (REQ-3.7 to REQ-3.9)', () => {
    it('an AI failure is confined to the AI status and leaves the rule plan intact', async () => {
      aiPlan.mockRejectedValue(new Error('boom'))
      const r = useRoadmapStore()
      r.generate()
      await flush()
      expect(r.aiStatus).toBe('error')
      expect(r.generated).toBe(true)
      expect(r.rulePlan).toHaveLength(3)
    })

    it('retry re-requests only the AI plan', async () => {
      aiPlan.mockRejectedValueOnce(new Error('boom'))
      const r = useRoadmapStore()
      r.generate()
      await flush()
      const rulePlanBefore = r.rulePlan
      await r.runAi()
      expect(aiPlan).toHaveBeenCalledTimes(2)
      expect(r.aiStatus).toBe('ready')
      expect(r.rulePlan).toEqual(rulePlanBefore)
    })

    it('ignores a late AI response after the stage has changed', async () => {
      const first = deferred<number[]>()
      aiPlan.mockReturnValueOnce(first.promise)
      const r = useRoadmapStore()
      r.generate()
      r.selectStage('uni')
      first.resolve([5, 6])
      await flush()
      expect(r.aiStatus).toBe('idle')
      expect(r.aiPlan).toEqual([])
    })
  })

  describe('saving (REQ-3.4, REQ-3.10)', () => {
    it('saves the rule-based plan with its stage and source', () => {
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      expect(r.saved).toEqual({ stage: 'secondary', source: 'Rule-Based Plan', choices: [8, 6, 5] })
      expect(r.generated).toBe(false)
      expect(r.showSaved).toBe(true)
      expect(r.savedPlan.map((n) => n.schoolName)[0]).toBe("St. Gabriel's Secondary School")
    })

    it('saves the AI-generated plan', async () => {
      const r = useRoadmapStore()
      r.generate()
      await flush()
      r.save('AI-Generated Plan')
      expect(r.saved).toEqual({
        stage: 'secondary',
        source: 'AI-Generated Plan',
        choices: [6, 5, 8],
      })
    })

    it('keeps at most one roadmap: saving again replaces it', () => {
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      r.selectStage('uni')
      r.generate()
      r.save('Rule-Based Plan')
      expect(r.saved?.stage).toBe('uni')
      expect(r.hasSaved).toBe(true)
    })
  })

  describe('editing a saved roadmap (REQ-3.5, REQ-3.13, REQ-3.14)', () => {
    function withSavedRoadmap() {
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      return r
    }

    it('offers only institutions from the saved stage', () => {
      const r = withSavedRoadmap()
      expect(r.savedPool.map((s) => s.tier)).toEqual([
        'secondary',
        'secondary',
        'secondary',
        'secondary',
      ])
    })

    it('saves changed choices', () => {
      const r = withSavedRoadmap()
      r.startEdit()
      expect(r.editing).toBe(true)
      expect(r.editChoices).toEqual([8, 6, 5])
      r.setChoice(0, 7)
      r.saveEdits()
      expect(r.editing).toBe(false)
      expect(r.saved?.choices).toEqual([7, 6, 5])
      expect(r.saved?.source).toBe('Rule-Based Plan')
    })

    it('cancel restores the stored version (REQ-3.15)', () => {
      const r = withSavedRoadmap()
      r.startEdit()
      r.setChoice(1, 7)
      r.cancelEdit()
      expect(r.editing).toBe(false)
      expect(r.saved?.choices).toEqual([8, 6, 5])
      r.startEdit()
      expect(r.editChoices).toEqual([8, 6, 5])
    })

    it('does nothing when there is no saved roadmap', () => {
      const r = useRoadmapStore()
      r.startEdit()
      expect(r.editing).toBe(false)
      r.saveEdits()
      expect(r.saved).toBeNull()
    })
  })

  describe('deleting (REQ-3.6, REQ-3.16)', () => {
    it('removes the roadmap and returns to the empty state', () => {
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      r.remove()
      expect(r.saved).toBeNull()
      expect(r.showEmpty).toBe(true)
      expect(r.showSaved).toBe(false)
    })
  })

  describe('page states', () => {
    it('starts empty, shows the generated plans, then the saved roadmap', () => {
      const r = useRoadmapStore()
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([true, false, false])
      r.generate()
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([false, false, true])
      r.save('Rule-Based Plan')
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([false, true, false])
    })

    it('a new target level in the profile starts the page over but keeps the saved roadmap', async () => {
      const profile = useProfileStore()
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      r.generate()
      await flush()
      profile.setLevel('primary')
      expect(r.generated).toBe(false)
      expect(r.aiStatus).toBe('idle')
      expect(r.saved).not.toBeNull()
    })

    it('reset drops everything, including the saved roadmap', () => {
      const r = useRoadmapStore()
      r.generate()
      r.save('Rule-Based Plan')
      r.reset()
      expect(r.saved).toBeNull()
      expect(r.showEmpty).toBe(true)
    })
  })
})
