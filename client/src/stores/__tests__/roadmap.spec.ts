import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { DISTANCE_LIMIT } from '@/data/ruleSort'
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
      // Its distance is not shown: it is only measured from the centre of the postal district.
      expect(r.rulePlan[0]?.detail).toBe('PSLE T-score cut-off: T-score ≥ 205')
    })

    it('[WB-AI-01] fills the AI plan when it arrives', async () => {
      const r = await generated()
      expect(r.aiStatus).toBe('ready')
      expect(r.aiPlan.map((n) => n.schoolName)).toEqual([
        'Bukit Panjang Govt. High School',
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
    })

    it('carries each school’s position so the plan can be mapped', async () => {
      const r = await generated()
      expect(r.rulePlan.map((n) => [n.latitude, n.longitude])).toEqual([
        [1.3497, 103.8715],
        [1.3457, 103.8437],
        [1.3395, 103.8336],
      ])
    })

    it('places the profile’s postal code once the server has located it', async () => {
      const r = await generated()
      expect(r.origin).toEqual({
        latitude: 1.37,
        longitude: 103.893,
        district: 'Serangoon Garden, Hougang, Punggol',
      })
    })

    it('has no place for a postal code that is not valid', async () => {
      useProfileStore().setPostal('12')
      const r = await generated()
      expect(r.origin).toBeNull()
    })

    it('asks the server with the stage, postal code and the profile’s score', async () => {
      const profile = useProfileStore()
      profile.scoreA = '8'
      await generated()
      const expected = { stage: 'secondary', postal: '556000', previous_academic_score: 8 }
      expect(api.callsTo(`POST ${RULE}`)[0]?.body).toMatchObject(expected)
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
      // Junior colleges have no entry figures in the dataset, so there is nothing to say of them.
      expect(r.rulePlan[0]?.detail).toBe('')
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

  describe('rule-based sort and distance limit', () => {
    /** The body of the nth request the rule-based plan was asked for. */
    const asked = (api: FakeApi, n = 0) => api.callsTo(`POST ${RULE}`)[n]?.body

    it('ranks by grade, with no distance limit, until told otherwise', async () => {
      const r = await generated()
      expect(r.ruleSort).toBe('grade')
      expect(r.ruleLimitKm).toBeNull()
      expect(asked(api)).toMatchObject({ sort_by: 'grade', max_distance_km: null })
    })

    it('sorting by distance asks for the rule-based plan again, and only that plan', async () => {
      useProfileStore().scoreA = '8'
      const r = await generated()
      // AL 8 does not reach Raffles Institution, which grade ranks after the nearer schools.
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        "St. Gabriel's Secondary School",
        "Cedar Girls' Secondary School",
        'Bukit Panjang Govt. High School',
      ])
      r.setRuleSort('distance')
      expect(r.ruleStatus).toBe('loading')
      await flushPromises()
      expect(asked(api, 1)).toMatchObject({ sort_by: 'distance', max_distance_km: null })
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual([
        "St. Gabriel's Secondary School",
        'Raffles Institution',
        "Cedar Girls' Secondary School",
      ])
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
    })

    it('a distance limit leaves out the schools further away', async () => {
      const r = await generated()
      r.setRuleDistance(5)
      await flushPromises()
      expect(r.ruleLimitKm).toBe(5)
      expect(asked(api, 1)).toMatchObject({ sort_by: 'grade', max_distance_km: 5 })
      // Only St. Gabriel's is within 5 km of the postal district.
      expect(r.rulePlan.map((n) => n.schoolName)).toEqual(["St. Gabriel's Secondary School"])
    })

    it('the top of the slider is no limit', async () => {
      const r = await generated()
      r.setRuleDistance(5)
      r.setRuleDistance(DISTANCE_LIMIT.max)
      await flushPromises()
      expect(r.ruleLimitKm).toBeNull()
      expect(asked(api, 2)).toMatchObject({ max_distance_km: null })
    })

    it('sorting by distance leaves the limit out, as the nearest schools are wanted anyway', async () => {
      const r = await generated()
      r.setRuleDistance(5)
      r.setRuleSort('distance')
      await flushPromises()
      expect(r.ruleLimitKm).toBeNull()
      expect(asked(api, 2)).toMatchObject({ sort_by: 'distance', max_distance_km: null })
      // The student's slider position is kept for when they go back to grade.
      expect(r.ruleDistance).toBe(5)
      r.setRuleSort('grade')
      expect(r.ruleLimitKm).toBe(5)
    })

    it('changing the sort before generating asks for nothing, and the choice is used when generating', async () => {
      const r = useRoadmapStore()
      r.setRuleSort('distance')
      r.setRuleDistance(5)
      expect(api.callsTo(`POST ${RULE}`)).toHaveLength(0)
      expect(r.ruleStatus).toBe('idle')
      r.generate()
      await flushPromises()
      expect(asked(api)).toMatchObject({ sort_by: 'distance', max_distance_km: null })
    })

    it('only the latest ranking counts when the student changes their mind quickly', async () => {
      const r = await generated()
      const release = api.hold(`POST ${RULE}`)
      r.setRuleDistance(5)
      r.setRuleDistance(DISTANCE_LIMIT.max)
      release()
      await flushPromises()
      expect(r.ruleStatus).toBe('ready')
      expect(r.rulePlan).toHaveLength(3)
    })

    it('has only distance to rank by where there is no grade, and goes back after', () => {
      const r = useRoadmapStore()
      expect(r.ruleSorts).toEqual(['distance', 'grade'])
      r.selectStage('primary')
      expect(r.ruleSorts).toEqual(['distance'])
      expect(r.ruleSort).toBe('distance')
      expect(r.ruleLimitKm).toBeNull()
      r.selectStage('uni')
      expect(r.ruleSorts).toEqual([])
      r.selectStage('postsec')
      expect(r.ruleSort).toBe('grade')
    })

    it('asks for distance in a stage without a grade, whatever was picked before', async () => {
      const r = useRoadmapStore()
      r.setRuleDistance(5)
      r.selectStage('primary')
      r.generate()
      await flushPromises()
      expect(asked(api)).toMatchObject({
        stage: 'primary',
        sort_by: 'distance',
        max_distance_km: null,
      })
    })

    it('reset puts the sort and the limit back', () => {
      const r = useRoadmapStore()
      r.setRuleSort('distance')
      r.setRuleDistance(5)
      r.reset()
      expect([r.ruleSort, r.ruleDistance]).toEqual(['grade', DISTANCE_LIMIT.max])
    })
  })

  describe('fault isolation (REQ-3.7 to REQ-3.9)', () => {
    it('[WB-AI-03] an AI failure is confined to the AI status and leaves the rule plan intact', async () => {
      api.ai = 'error'
      const r = await generated()
      expect(r.aiStatus).toBe('error')
      expect(r.ruleStatus).toBe('ready')
      expect(r.generated).toBe(true)
      expect(r.rulePlan).toHaveLength(3)
      expect(r.aiPlan).toEqual([])
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
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

    it('[WB-AI-02] ignores a late AI response after the stage has changed', async () => {
      const release = api.hold(`POST ${AI}`)
      const r = useRoadmapStore()
      r.generate()
      r.selectStage('uni')
      release()
      await flushPromises()
      expect(r.aiStatus).toBe('idle')
      expect(r.aiPlan).toEqual([])
      expect(r.stage).toBe('uni')
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
      expect(api.callsTo(`POST ${AI}`)[0]?.body).toEqual({
        stage: 'secondary',
        postal: '556000',
        previous_academic_score: null,
      })
    })

    // Basis Path P4:
    // The AI request fails after it has already become stale.
    // run !== aiRun is therefore true in the catch branch,
    // so the old error must be ignored.
    it('[WB-AI-04] ignores a late AI error after the stage has changed', async () => {
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
      expect(r.stage).toBe('uni')
      expect(api.callsTo(`POST ${AI}`)).toHaveLength(1)
      expect(api.callsTo(`POST ${AI}`)[0]?.body).toEqual({
        stage: 'secondary',
        postal: '556000',
        previous_academic_score: null,
      })
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
