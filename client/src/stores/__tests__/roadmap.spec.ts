import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { signInAs } from '@/test/helpers'
import { useProfileStore } from '../profile'
import { useRoadmapStore } from '../roadmap'

const RULE = '/roadmap/generate-rule-roadmap'
const AI = '/roadmap/generate-ai-roadmap'

describe('roadmap store (UC-3.1 to UC-3.4)', () => {
  let api: FakeApi

  /** The secondary schools by distance from 556000: St. Gabriel's, Raffles, Cedar Girls'. */
  const RULE_CHOICES = [8, 5, 6]
  /** The same schools in name order, as the fake AI plan gives them. */
  const AI_CHOICES = [7, 6, 5]

  beforeEach(async () => {
    setActivePinia(createPinia())
    api = stubApi()
    await signInAs('planner2026')
    useProfileStore().setPostal('556000')
  })

  /** Generates both plans and waits for them. */
  async function generated() {
    const r = useRoadmapStore()
    r.generate()
    await flushPromises()
    return r
  }

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
      const r = await generated()
      r.selectStage('primary')
      expect(r.generated).toBe(false)
      expect([r.ruleStatus, r.aiStatus]).toEqual(['idle', 'idle'])
      expect(r.rulePlan).toEqual([])
    })
  })

  describe('generate', () => {
    it('is blocked without a valid postal code and starts nothing (REQ-3.12)', () => {
      useProfileStore().setPostal('123')
      const r = useRoadmapStore()
      expect(r.generate()).toBe(false)
      expect(r.generated).toBe(false)
      expect(api.callsTo(`POST ${RULE}`)).toHaveLength(0)
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(0)
    })

    it('starts both plans, each on its own (REQ-3.1, QUAL-6)', () => {
      const r = useRoadmapStore()
      expect(r.generate()).toBe(true)
      expect(r.generated).toBe(true)
      expect([r.ruleStatus, r.aiStatus]).toEqual(['loading', 'loading'])
    })

    it('fills the rule-based plan with the nearest schools first', async () => {
      const r = await generated()
      expect(r.ruleStatus).toBe('ready')
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        "St. Gabriel's Secondary School",
        'Raffles Institution',
        "Cedar Girls' Secondary School",
      ])
      expect(r.rulePlan[0]?.detail).toMatch(
        /^PSLE T-score cut-off: T-score ≥ 205 · \d\.\d km from 556000$/,
      )
    })

    it('fills the AI plan when it arrives', async () => {
      const r = await generated()
      expect(r.aiStatus).toBe('ready')
      expect(r.aiPlan.map((n) => n.schoolName)).toEqual([
        'Bukit Panjang Govt. High School',
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
    })

    it('asks the server with the stage, postal code and the profile’s score', async () => {
      const profile = useProfileStore()
      profile.scoreA = '8'
      await generated()
      const expected = { stage: 'secondary', postal: '556000', previous_academic_score: 8 }
      expect(api.callsTo(`POST ${RULE}`)[0]?.body).toEqual(expected)
      expect(api.callsTo(`POST ${AI}`)[0]?.body).toEqual(expected)
    })

    it('sends no score when none is entered, or when the stage is not the target level', async () => {
      const profile = useProfileStore()
      const r = await generated()
      expect(api.callsTo(`POST ${RULE}`)[0]?.body).toMatchObject({ previous_academic_score: null })

      profile.scoreA = '8'
      r.selectStage('postsec')
      r.generate()
      await flushPromises()
      expect(api.callsTo(`POST ${RULE}`)[1]?.body).toMatchObject({
        stage: 'postsec',
        previous_academic_score: null,
      })
    })

    it('uses the rule set of the chosen stage (REQ-3.2)', async () => {
      const r = useRoadmapStore()
      r.selectStage('postsec')
      r.generate()
      await flushPromises()
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        'Raffles Institution',
        'Eunoia Junior College',
        'Temasek Junior College',
      ])
      // Junior colleges have no entry figures in the dataset, so none is shown.
      expect(r.rulePlan[0]?.detail).toMatch(/^\d\.\d km from 556000$/)
    })

    it('has no institutions to plan with for a stage the dataset lacks', async () => {
      const r = useRoadmapStore()
      r.selectStage('uni')
      r.generate()
      await flushPromises()
      expect(r.ruleStatus).toBe('ready')
      expect(r.rulePlan).toEqual([])
      expect(r.aiPlan).toEqual([])
    })
  })

  describe('fault isolation (REQ-3.7 to REQ-3.9)', () => {
    it('an AI failure is confined to the AI status and leaves the rule plan intact', async () => {
      api.ai = 'error'
      const r = await generated()
      expect(r.aiStatus).toBe('error')
      expect(r.ruleStatus).toBe('ready')
      expect(r.generated).toBe(true)
      expect(r.rulePlan).toHaveLength(3)
    })

    it('a rule-based failure is confined to its own status', async () => {
      api.override(`POST ${RULE}`, () => {
        throw new TypeError('Failed to fetch')
      })
      const r = await generated()
      expect(r.ruleStatus).toBe('error')
      expect(r.aiStatus).toBe('ready')
      expect(r.aiPlan).toHaveLength(3)
    })

    it('retry re-requests only the AI plan', async () => {
      api.ai = 'error'
      const r = await generated()
      const rulePlanBefore = r.rulePlan
      api.ai = 'ok'
      await r.runAi()
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(2)
      expect(api.callsTo(`POST ${RULE}`)).toHaveLength(1)
      expect(r.aiStatus).toBe('ready')
      expect(r.rulePlan).toEqual(rulePlanBefore)
    })

    it('retry re-requests only the rule-based plan', async () => {
      api.override(`POST ${RULE}`, () => {
        throw new TypeError('Failed to fetch')
      })
      const r = await generated()
      api.restore(`POST ${RULE}`)
      await r.runRule()
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
      expect(r.ruleStatus).toBe('ready')
      expect(r.rulePlan.map((n) => n.step)).toEqual([1, 2, 3])
    })

    it('ignores a late AI response after the stage has changed', async () => {
      const release = api.hold(`POST ${AI}`)
      const r = useRoadmapStore()
      r.generate()
      r.selectStage('uni')
      release()
      await flushPromises()
      expect(r.aiStatus).toBe('idle')
      expect(r.aiPlan).toEqual([])
    })

    // Basis Path P4:
    // The AI request fails after it has already become stale.
    // run !== aiRun is therefore true in the catch branch,
    // so the old error must be ignored.
    it('ignores a late AI error after the stage has changed', async () => {
      const release = api.hold(`POST ${AI}`)
      const r = useRoadmapStore()
      r.generate()
      // Changing stage invalidates the earlier AI request.
      r.selectStage('uni')
      // The old request fails after it has already become stale.
      api.ai = 'error'
      release()
      await flushPromises()
      // The stale failure must not overwrite the current state.
      expect(r.aiStatus).toBe('idle')
      expect(r.aiPlan).toEqual([])
    })
  })

  describe('saving (REQ-3.4, REQ-3.10)', () => {
    it('saves the rule-based plan with its stage and source', async () => {
      const r = await generated()
      expect(await r.save('Rule-Based Plan')).toBe('')
      expect(r.saved).toEqual({
        stage: 'secondary',
        source: 'Rule-Based Plan',
        choices: RULE_CHOICES,
      })
      expect(api.roadmaps['planner2026']).toEqual(r.saved)
      expect(r.generated).toBe(false)
      expect(r.showSaved).toBe(true)
      expect(r.savedPlan.map((n) => n.schoolName)[0]).toBe("St. Gabriel's Secondary School")
    })

    it('saves the AI-generated plan', async () => {
      const r = await generated()
      await r.save('AI-Generated Plan')
      expect(r.saved).toEqual({
        stage: 'secondary',
        source: 'AI-Generated Plan',
        choices: AI_CHOICES,
      })
    })

    it('keeps at most one roadmap: saving again replaces it', async () => {
      const r = await generated()
      await r.save('Rule-Based Plan')
      r.selectStage('postsec')
      r.generate()
      await flushPromises()
      await r.save('Rule-Based Plan')
      expect(r.saved?.stage).toBe('postsec')
      expect(api.roadmaps['planner2026']?.stage).toBe('postsec')
    })

    it('keeps the plans on screen and reports the reason when the server refuses', async () => {
      api.override('PUT /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      const r = await generated()
      expect(await r.save('Rule-Based Plan')).toMatch(/Unable to complete your request/)
      expect(r.saved).toBeNull()
      expect(r.generated).toBe(true)
      expect(r.rulePlan).toHaveLength(3)
    })
  })

  describe('reading the saved roadmap', () => {
    it('shows the roadmap stored with the account, with its schools', async () => {
      api.roadmaps['planner2026'] = {
        stage: 'secondary',
        source: 'AI-Generated Plan',
        choices: [6, 5],
      }
      const r = useRoadmapStore()
      await r.load()
      expect(r.saved).toEqual({ stage: 'secondary', source: 'AI-Generated Plan', choices: [6, 5] })
      expect(r.savedPlan.map((n) => n.schoolName)).toEqual([
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(r.showSaved).toBe(true)
    })

    it('shows a choice whose school no longer exists as not available', async () => {
      api.roadmaps['planner2026'] = {
        stage: 'secondary',
        source: 'Rule-Based Plan',
        choices: [6, 999],
      }
      const r = useRoadmapStore()
      await r.load()
      expect(r.savedPlan[1]).toMatchObject({ schoolName: 'Not available', detail: 'Not available' })
    })

    it('shows the empty page when nothing is saved', async () => {
      const r = useRoadmapStore()
      await r.load()
      expect(r.saved).toBeNull()
      expect(r.showEmpty).toBe(true)
    })
  })

  describe('editing a saved roadmap (REQ-3.5, REQ-3.13, REQ-3.14)', () => {
    async function withSavedRoadmap() {
      const r = await generated()
      await r.save('Rule-Based Plan')
      return r
    }

    it('offers only institutions from the saved stage', async () => {
      const r = await withSavedRoadmap()
      await r.startEdit()
      expect(r.savedPool.map((s) => s.tier)).toEqual([
        'secondary',
        'secondary',
        'secondary',
        'secondary',
      ])
    })

    it('saves changed choices', async () => {
      const r = await withSavedRoadmap()
      await r.startEdit()
      expect(r.editing).toBe(true)
      expect(r.editChoices).toEqual(RULE_CHOICES)
      r.setChoice(0, 7)
      expect(await r.saveEdits()).toBe('')
      expect(r.editing).toBe(false)
      expect(r.saved?.choices).toEqual([7, 5, 6])
      expect(r.saved?.source).toBe('Rule-Based Plan')
      expect(api.roadmaps['planner2026']?.choices).toEqual([7, 5, 6])
      expect(r.savedPlan[0]?.schoolName).toBe('Bukit Panjang Govt. High School')
    })

    it('cancel restores the stored version (REQ-3.15)', async () => {
      const r = await withSavedRoadmap()
      await r.startEdit()
      r.setChoice(1, 7)
      r.cancelEdit()
      expect(r.editing).toBe(false)
      expect(r.saved?.choices).toEqual(RULE_CHOICES)
      await r.startEdit()
      expect(r.editChoices).toEqual(RULE_CHOICES)
    })

    it('keeps editing and reports the reason when the server refuses the change', async () => {
      const r = await withSavedRoadmap()
      await r.startEdit()
      r.setChoice(0, 7)
      api.override('PATCH /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      expect(await r.saveEdits()).toMatch(/Unable to complete your request/)
      expect(r.editing).toBe(true)
      expect(r.saved?.choices).toEqual(RULE_CHOICES)
    })

    it('does nothing when there is no saved roadmap', async () => {
      const r = useRoadmapStore()
      await r.startEdit()
      expect(r.editing).toBe(false)
      expect(await r.saveEdits()).toBe('')
      expect(r.saved).toBeNull()
      expect(api.callsTo('PATCH /roadmap')).toHaveLength(0)
    })
  })

  describe('deleting (REQ-3.6, REQ-3.16)', () => {
    it('removes the roadmap and returns to the empty state', async () => {
      const r = await generated()
      await r.save('Rule-Based Plan')
      expect(await r.remove()).toBe('')
      expect(r.saved).toBeNull()
      expect(r.showEmpty).toBe(true)
      expect(r.showSaved).toBe(false)
      expect(api.roadmaps['planner2026']).toBeUndefined()
    })

    it('keeps the roadmap and reports the reason when the server refuses', async () => {
      const r = await generated()
      await r.save('Rule-Based Plan')
      api.override('DELETE /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      expect(await r.remove()).toMatch(/Unable to complete your request/)
      expect(r.saved).not.toBeNull()
    })
  })

  describe('page states', () => {
    it('starts empty, shows the generated plans, then the saved roadmap', async () => {
      const r = useRoadmapStore()
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([true, false, false])
      r.generate()
      await flushPromises()
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([false, false, true])
      await r.save('Rule-Based Plan')
      expect([r.showEmpty, r.showSaved, r.generated]).toEqual([false, true, false])
    })

    it('a new target level in the profile starts the page over but keeps the saved roadmap', async () => {
      const profile = useProfileStore()
      const r = await generated()
      await r.save('Rule-Based Plan')
      r.generate()
      await flushPromises()
      profile.setLevel('primary')
      expect(r.generated).toBe(false)
      expect(r.aiStatus).toBe('idle')
      expect(r.saved).not.toBeNull()
    })

    it('reset drops everything, including the saved roadmap', async () => {
      const r = await generated()
      await r.save('Rule-Based Plan')
      r.reset()
      expect(r.saved).toBeNull()
      expect(r.showEmpty).toBe(true)
    })
  })
})
