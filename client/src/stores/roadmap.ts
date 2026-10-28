import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, GENERIC_ERROR } from '@/services/http'
import * as roadmapService from '@/services/roadmapService'
import type { PlanRequest, StoredRoadmap } from '@/services/roadmapService'
import type { PlanSource, PlanStatus, SavedRoadmap } from '@/types/roadmap'
import type { School, TierId } from '@/types/school'
import { planNodes, PLAN_LENGTH } from '@/utils/roadmapPlan'
import { useDirectoryStore } from './directory'
import { useLocationStore } from './location'
import { useProfileStore } from './profile'

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : GENERIC_ERROR)

/** Education roadmap generation and the single saved roadmap (UC-3.1 to UC-3.4). */
export const useRoadmapStore = defineStore('roadmap', () => {
  const profile = useProfileStore()
  const location = useLocationStore()
  const directory = useDirectoryStore()

  /** Stage picked on the roadmap page; follows the profile's target level until overridden. */
  const stageOverride = ref<TierId | null>(null)
  const stage = computed(() => stageOverride.value ?? profile.level)

  const generated = ref(false)
  const ruleStatus = ref<PlanStatus>('idle')
  const ruleChoices = ref<number[]>([])
  const aiStatus = ref<PlanStatus>('idle')
  const aiChoices = ref<number[]>([])
  const saved = ref<SavedRoadmap | null>(null)
  const editing = ref(false)
  const editChoices = ref<number[]>([])
  /** Institutions the saved roadmap's choices can be swapped for while editing (REQ-3.14). */
  const savedPool = ref<School[]>([])
  /** Every school the server has described so far, by stage and id. */
  const described = ref<Record<string, School>>({})
  /** Identify the latest request of each plan so a superseded one cannot overwrite newer state. */
  let ruleRun = 0
  let aiRun = 0

  /** The schools described for a stage, with their distance from the profile's postal code. */
  function schoolsOf(stage: TierId): Record<number, School> {
    return Object.fromEntries(
      Object.values(described.value)
        .filter((school) => school.tier === stage)
        .map((school) => [school.id, location.withDistance(school, profile.postal)]),
    )
  }

  const rulePlan = computed(() =>
    planNodes(
      ruleChoices.value.slice(0, PLAN_LENGTH),
      schoolsOf(stage.value),
      stage.value,
      profile.postal,
    ),
  )
  const aiPlan = computed(() =>
    planNodes(
      aiChoices.value.slice(0, PLAN_LENGTH),
      schoolsOf(stage.value),
      stage.value,
      profile.postal,
    ),
  )
  const savedPlan = computed(() =>
    saved.value
      ? planNodes(
          saved.value.choices,
          schoolsOf(saved.value.stage),
          saved.value.stage,
          profile.postal,
        )
      : [],
  )

  /** Where the profile's postal code is placed, once the server has located it. */
  const origin = computed(() => location.originOf(profile.postal))

  const hasSaved = computed(() => saved.value !== null)
  const showSaved = computed(() => hasSaved.value && !generated.value)
  const showEmpty = computed(() => !hasSaved.value && !generated.value)

  function remember(list: School[]) {
    for (const school of list) described.value[`${school.tier}:${school.id}`] = school
  }

  function discardRuns() {
    ruleRun++
    aiRun++
    ruleStatus.value = 'idle'
    ruleChoices.value = []
    aiStatus.value = 'idle'
    aiChoices.value = []
  }

  // A new target level in the profile starts the roadmap page over.
  watch(
    () => profile.level,
    () => {
      stageOverride.value = null
      generated.value = false
      discardRuns()
    },
    { flush: 'sync' },
  )

  function selectStage(id: TierId) {
    stageOverride.value = id
    generated.value = false
    discardRuns()
  }

  /** What the plans are generated from. The score only applies to the stage the profile targets. */
  function planRequest(): PlanRequest {
    const score = stage.value === profile.level ? Number(profile.scoreA) : NaN
    return {
      stage: stage.value,
      postal: profile.postal,
      score: profile.scoreA.trim() === '' || Number.isNaN(score) ? null : score,
    }
  }

  /** Requests the rule-based plan on its own, so it can fail or retry without touching the AI plan. */
  async function runRule() {
    const run = ++ruleRun
    ruleStatus.value = 'loading'
    try {
      const plan = await roadmapService.generateRulePlan(planRequest())
      if (run !== ruleRun) return
      remember(plan.schools)
      ruleChoices.value = plan.choices
      ruleStatus.value = 'ready'
    } catch {
      if (run !== ruleRun) return
      ruleStatus.value = 'error'
    }
  }

  /** Requests the AI plan on its own, so it can fail or retry without touching the rule plan. */
  async function runAi() {
    const run = ++aiRun
    aiStatus.value = 'loading'
    try {
      const plan = await roadmapService.generateAiPlan(planRequest())
      if (run !== aiRun) return
      remember(plan.schools)
      aiChoices.value = plan.choices
      aiStatus.value = 'ready'
    } catch {
      if (run !== aiRun) return
      aiStatus.value = 'error'
    }
  }

  /**
   * Starts both plans, each on its own so one failing leaves the other intact.
   * Returns false, without generating, when no valid postal code is on file (REQ-3.12).
   */
  function generate(): boolean {
    if (!profile.postalValid) return false
    generated.value = true
    editing.value = false
    void location.locate(profile.postal)
    void runRule()
    void runAi()
    return true
  }

  function applyStored(stored: StoredRoadmap) {
    remember(stored.schools)
    saved.value = { stage: stored.stage, source: stored.source, choices: stored.choices }
    void location.locate(profile.postal)
  }

  /** Reads the account's saved roadmap. Having none, or failing to read it, shows the empty page. */
  async function load() {
    try {
      const stored = await roadmapService.fetchSavedRoadmap()
      if (stored) applyStored(stored)
    } catch {
      saved.value = null
    }
  }

  /** Stores the chosen plan, replacing any existing roadmap (REQ-3.10). Returns an error message, or ''. */
  async function save(source: PlanSource): Promise<string> {
    const choices = source === 'Rule-Based Plan' ? ruleChoices.value : aiChoices.value
    try {
      applyStored(
        await roadmapService.saveRoadmap({
          stage: stage.value,
          source,
          choices: choices.slice(0, PLAN_LENGTH),
        }),
      )
    } catch (error) {
      return messageOf(error)
    }
    generated.value = false
    editing.value = false
    discardRuns()
    return ''
  }

  async function startEdit() {
    if (!saved.value) return
    editChoices.value = saved.value.choices.slice()
    editing.value = true
    const tier = saved.value.stage
    savedPool.value = tier === 'preschool' ? [] : await directory.loadTier(tier)
    remember(savedPool.value)
  }

  function setChoice(index: number, schoolId: number) {
    editChoices.value[index] = schoolId
  }

  /** Stores the edited choices. Returns an error message, or ''. */
  async function saveEdits(): Promise<string> {
    if (!saved.value) return ''
    try {
      applyStored(await roadmapService.editSavedRoadmap(editChoices.value.slice()))
    } catch (error) {
      return messageOf(error)
    }
    editing.value = false
    editChoices.value = []
    return ''
  }

  function cancelEdit() {
    editing.value = false
    editChoices.value = []
  }

  /** Deletes the saved roadmap. Returns an error message, or ''. */
  async function remove(): Promise<string> {
    try {
      await roadmapService.deleteSavedRoadmap()
    } catch (error) {
      return messageOf(error)
    }
    saved.value = null
    editing.value = false
    editChoices.value = []
    generated.value = false
    discardRuns()
    return ''
  }

  function reset() {
    stageOverride.value = null
    generated.value = false
    saved.value = null
    editing.value = false
    editChoices.value = []
    savedPool.value = []
    described.value = {}
    discardRuns()
  }

  return {
    stage,
    generated,
    ruleStatus,
    aiStatus,
    saved,
    editing,
    editChoices,
    rulePlan,
    aiPlan,
    savedPlan,
    savedPool,
    origin,
    hasSaved,
    showSaved,
    showEmpty,
    selectStage,
    generate,
    runRule,
    runAi,
    load,
    save,
    startEdit,
    setChoice,
    saveEdits,
    cancelEdit,
    remove,
    reset,
  }
})
