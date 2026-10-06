import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { generateAiPlan } from '@/services/roadmapAiService'
import type { AiStatus, PlanSource, SavedRoadmap } from '@/types/roadmap'
import type { TierId } from '@/types/school'
import {
  eligibleSchools,
  PLAN_LENGTH,
  ruleBasedOrder,
  savedPlanNodes,
  toPlanNodes,
} from '@/utils/roadmapPlan'
import { useProfileStore } from './profile'

/** Education roadmap generation and the single saved roadmap (UC-3.1 to UC-3.4). */
export const useRoadmapStore = defineStore('roadmap', () => {
  const profile = useProfileStore()

  /** Stage picked on the roadmap page; follows the profile's target level until overridden. */
  const stageOverride = ref<TierId | null>(null)
  const stage = computed(() => stageOverride.value ?? profile.level)

  const generated = ref(false)
  const aiStatus = ref<AiStatus>('idle')
  const aiChoices = ref<number[]>([])
  const saved = ref<SavedRoadmap | null>(null)
  const editing = ref(false)
  const editChoices = ref<number[]>([])
  /** Identifies the latest AI request so a superseded one cannot overwrite newer state. */
  let aiRun = 0

  const pool = computed(() => eligibleSchools(stage.value))
  const rulePlan = computed(() =>
    toPlanNodes(ruleBasedOrder(pool.value), stage.value, profile.postal),
  )
  const aiPlan = computed(() =>
    savedPlanNodes(aiChoices.value.slice(0, PLAN_LENGTH), stage.value, profile.postal),
  )
  const savedPlan = computed(() =>
    saved.value ? savedPlanNodes(saved.value.choices, saved.value.stage, profile.postal) : [],
  )
  /** Institutions a saved roadmap's choices can be swapped for while editing (REQ-3.14). */
  const savedPool = computed(() => (saved.value ? eligibleSchools(saved.value.stage) : []))

  const hasSaved = computed(() => saved.value !== null)
  const showSaved = computed(() => hasSaved.value && !generated.value)
  const showEmpty = computed(() => !hasSaved.value && !generated.value)

  function discardAiRun() {
    aiRun++
    aiStatus.value = 'idle'
    aiChoices.value = []
  }

  // A new target level in the profile starts the roadmap page over.
  watch(
    () => profile.level,
    () => {
      stageOverride.value = null
      generated.value = false
      discardAiRun()
    },
    { flush: 'sync' },
  )

  function selectStage(id: TierId) {
    stageOverride.value = id
    generated.value = false
    discardAiRun()
  }

  /** Requests the AI plan on its own, so it can fail or retry without touching the rule plan. */
  async function runAi() {
    const run = ++aiRun
    aiStatus.value = 'loading'
    try {
      const choices = await generateAiPlan(stage.value)
      if (run !== aiRun) return
      aiChoices.value = choices
      aiStatus.value = 'ready'
    } catch {
      if (run !== aiRun) return
      aiStatus.value = 'error'
    }
  }

  /**
   * Shows the rule-based plan immediately and starts the AI plan in the background.
   * Returns false, without generating, when no valid postal code is on file (REQ-3.12).
   */
  function generate(): boolean {
    if (!profile.postalValid) return false
    generated.value = true
    editing.value = false
    void runAi()
    return true
  }

  /** Stores the chosen plan, replacing any existing roadmap (REQ-3.10). */
  function save(source: PlanSource) {
    const order = source === 'Rule-Based Plan' ? rulePlanChoices() : aiChoices.value
    saved.value = { stage: stage.value, source, choices: order.slice(0, PLAN_LENGTH) }
    generated.value = false
    editing.value = false
    discardAiRun()
  }

  function rulePlanChoices(): number[] {
    return ruleBasedOrder(pool.value).map((school) => school.id)
  }

  function startEdit() {
    if (!saved.value) return
    editChoices.value = saved.value.choices.slice()
    editing.value = true
  }

  function setChoice(index: number, schoolId: number) {
    editChoices.value[index] = schoolId
  }

  function saveEdits() {
    if (!saved.value) return
    saved.value = { ...saved.value, choices: editChoices.value.slice() }
    editing.value = false
    editChoices.value = []
  }

  function cancelEdit() {
    editing.value = false
    editChoices.value = []
  }

  function remove() {
    saved.value = null
    editing.value = false
    editChoices.value = []
    generated.value = false
    discardAiRun()
  }

  function reset() {
    stageOverride.value = null
    generated.value = false
    saved.value = null
    editing.value = false
    editChoices.value = []
    discardAiRun()
  }

  return {
    stage,
    generated,
    aiStatus,
    saved,
    editing,
    editChoices,
    rulePlan,
    aiPlan,
    savedPlan,
    savedPool,
    hasSaved,
    showSaved,
    showEmpty,
    selectStage,
    generate,
    runAi,
    save,
    startEdit,
    setChoice,
    saveEdits,
    cancelEdit,
    remove,
    reset,
  }
})
