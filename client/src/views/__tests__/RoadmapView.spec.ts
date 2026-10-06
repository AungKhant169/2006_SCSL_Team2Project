import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { generateAiPlan } from '@/services/roadmapAiService'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import { useUiStore } from '@/stores/ui'
import { mountWithApp } from '@/test/helpers'
import RoadmapView from '../RoadmapView.vue'

vi.mock('@/services/roadmapAiService', () => ({ generateAiPlan: vi.fn() }))
const aiPlan = vi.mocked(generateAiPlan)

const mountRoadmap = () =>
  mountWithApp(RoadmapView, { route: '/roadmap', signedInAs: 'planner2026' })

const button = (w: VueWrapper, label: string) =>
  w.findAll('button').find((b) => b.text() === label)!
const click = (w: VueWrapper, label: string) => button(w, label).trigger('click')
const stageTile = (w: VueWrapper, label: string) =>
  w.findAll('button[aria-pressed]').find((b) => b.text().includes(label))!
const headings = (w: VueWrapper) => w.findAll('h2, h3').map((h) => h.text())
const schools = (panel: ReturnType<VueWrapper['get']>) =>
  panel.findAll('ol li span.font-semibold').map((s) => s.text())
const panel = (w: VueWrapper, title: string) =>
  w.findAll('section').find((s) => s.find('h2')?.text() === title)!

/** A promise the test settles by hand so the AI loading state can be observed. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function generate(w: VueWrapper) {
  await w
    .findAll('button')
    .find((b) => b.text() === 'Generate Roadmap')!
    .trigger('click')
  await flushPromises()
}

describe('RoadmapView (UC-3.1 to UC-3.4)', () => {
  beforeEach(() => {
    aiPlan.mockReset()
    aiPlan.mockResolvedValue([6, 5, 8, 7])
  })
  afterEach(() => vi.unstubAllGlobals())

  describe('stage selection and empty state', () => {
    it('opens with no roadmap saved and a single call to action (REQ-3.16)', async () => {
      const { wrapper } = await mountRoadmap()
      expect(wrapper.get('h1').text()).toBe('Education roadmap')
      expect(wrapper.text()).toContain('No roadmap saved yet')
      expect(wrapper.text()).not.toContain('Edit Roadmap')
      expect(wrapper.text()).not.toContain('Delete Roadmap')
    })

    it('pre-selects the stage from the profile and says where it came from', async () => {
      const { wrapper } = await mountRoadmap()
      expect(stageTile(wrapper, 'S1 Posting').attributes('aria-pressed')).toBe('true')
      expect(wrapper.text()).toContain(
        'Pre-selected from your profile: Primary → Secondary · PSLE AL 8 · postal 556000',
      )
    })

    it('lets the student pick any of the five stages', async () => {
      const { wrapper } = await mountRoadmap()
      expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(5)
      await stageTile(wrapper, 'Autonomous University').trigger('click')
      expect(stageTile(wrapper, 'Autonomous University').attributes('aria-pressed')).toBe('true')
      expect(stageTile(wrapper, 'S1 Posting').attributes('aria-pressed')).toBe('false')
      expect(wrapper.text()).toContain('Post-Secondary → University')
    })

    it('reflects the profile score for the caption, or says none is on file', async () => {
      const { wrapper } = await mountRoadmap()
      useProfileStore().setLevel('primary')
      await flushPromises()
      expect(wrapper.text()).toContain('No score on file')
    })
  })

  describe('generating (REQ-3.1, REQ-3.12)', () => {
    it('is blocked without a valid postal code, offering a way to fix it', async () => {
      const { wrapper, router } = await mountRoadmap()
      useProfileStore().setPostal('12')
      await generate(wrapper)
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('postal')
      expect(ui.modalDefinition?.title).toBe('Missing Profile Information')
      expect(ui.modalDefinition?.body).toBe(
        'Please enter your postal code in your profile before generating a roadmap.',
      )
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(aiPlan).not.toHaveBeenCalled()

      ui.confirmModal()
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('profile')
    })

    it('shows the postal code as missing in the caption', async () => {
      const { wrapper } = await mountRoadmap()
      useProfileStore().setPostal('')
      await flushPromises()
      expect(wrapper.text()).toContain('postal missing')
    })

    it('produces two plans side by side', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      expect(headings(wrapper)).toEqual([
        'Target transition stage',
        'Rule-Based Plan',
        'AI-Generated Plan',
      ])
    })

    it('rule-based plan lists the three nearest eligible schools straight away', async () => {
      const gate = deferred<number[]>()
      aiPlan.mockReturnValue(gate.promise)
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      const rule = panel(wrapper, 'Rule-Based Plan')
      expect(schools(rule)).toEqual([
        "St. Gabriel's Secondary School",
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(rule.text()).toContain('Starting from')
      expect(rule.text()).toContain(
        'Primary school (current) — currently enrolled, per your profile',
      )
      expect(rule.text()).toContain('PSLE AL range: AL 4 – 15 · 1.1 km from 556000')
      expect(rule.text()).toContain('Applies the Primary → Secondary rule set')
    })

    it('AI plan shows its own loading state, then the plan (REQ-3.7, QUAL-6)', async () => {
      const gate = deferred<number[]>()
      aiPlan.mockReturnValue(gate.promise)
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      const ai = () => panel(wrapper, 'AI-Generated Plan')
      expect(ai().find('[role="status"]').exists()).toBe(true)
      expect(ai().text()).toContain('Generating an alternative pathway from your profile')
      expect(ai().text()).not.toContain('Save Roadmap')
      // The rule-based plan is already usable while the AI panel loads.
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain('Save Roadmap')

      gate.resolve([6, 5, 8, 7])
      await flushPromises()
      expect(ai().find('[role="status"]').exists()).toBe(false)
      expect(schools(ai())).toEqual([
        "Cedar Girls' Secondary School",
        'Raffles Institution',
        "St. Gabriel's Secondary School",
      ])
      expect(ai().text()).toContain('Alternative ordering weighted towards benchmark fit')
    })

    it('uses the stage-specific pool for another stage (REQ-3.2)', async () => {
      const { wrapper } = await mountRoadmap()
      await stageTile(wrapper, 'Autonomous University').trigger('click')
      await generate(wrapper)
      expect(schools(panel(wrapper, 'Rule-Based Plan'))).toEqual([
        'Kaplan Higher Education (Private)',
        'Singapore Management University',
        'National University of Singapore',
      ])
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain('Post-secondary (current)')
    })

    it('says so when the chosen stage has no institutions yet', async () => {
      const { wrapper } = await mountRoadmap()
      await stageTile(wrapper, 'Preschool placement').trigger('click')
      await generate(wrapper)
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain(
        'No institutions are available for this stage yet.',
      )
    })

    it('changing the stage discards a generated plan', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await stageTile(wrapper, 'P1 Registration').trigger('click')
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(wrapper.text()).toContain('No roadmap saved yet')
    })
  })

  describe('AI failure stays inside the AI panel (REQ-3.8, REQ-3.9, QUAL-7)', () => {
    async function failedAi() {
      aiPlan.mockRejectedValueOnce(new Error('boom'))
      const mounted = await mountRoadmap()
      await generate(mounted.wrapper)
      return mounted.wrapper
    }

    it('shows the prescribed message and a retry control in the AI panel only', async () => {
      const wrapper = await failedAi()
      const ai = panel(wrapper, 'AI-Generated Plan')
      expect(ai.get('[role="alert"]').text()).toContain(
        'Unable to generate AI recommendation at this time. Please try again.',
      )
      expect(ai.findAll('button').map((b) => b.text())).toEqual(['Retry AI Generation'])
      const rule = panel(wrapper, 'Rule-Based Plan')
      expect(rule.find('[role="alert"]').exists()).toBe(false)
      expect(schools(rule)).toHaveLength(3)
    })

    it('Retry re-runs only the AI request, without reloading the rule-based plan', async () => {
      const wrapper = await failedAi()
      const ruleBefore = panel(wrapper, 'Rule-Based Plan').html()
      await click(wrapper, 'Retry AI Generation')
      await flushPromises()
      expect(aiPlan).toHaveBeenCalledTimes(2)
      expect(schools(panel(wrapper, 'AI-Generated Plan'))).toHaveLength(3)
      expect(panel(wrapper, 'Rule-Based Plan').html()).toBe(ruleBefore)
    })

    it('the rule-based plan can still be saved while the AI plan has failed', async () => {
      const wrapper = await failedAi()
      await click(wrapper, 'Save Roadmap')
      expect(wrapper.text()).toContain('Saved roadmap')
      expect(wrapper.text()).toContain('Primary → Secondary · Rule-Based Plan')
    })
  })

  describe('saving (REQ-3.4, REQ-3.10, REQ-3.11)', () => {
    it('saves the rule-based plan and shows it as the saved roadmap with a confirmation', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await panel(wrapper, 'Rule-Based Plan').get('button').trigger('click')
      await flushPromises()
      const saved = panel(wrapper, 'Saved roadmap')
      expect(saved.text()).toContain('Primary → Secondary · Rule-Based Plan')
      expect(schools(saved)).toEqual([
        "St. Gabriel's Secondary School",
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(saved.findAll('button').map((b) => b.text())).toEqual([
        'Edit Roadmap',
        'Delete Roadmap',
      ])
      expect(useUiStore().notice).toBe('Roadmap saved to your profile.')
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(wrapper.text()).not.toContain('No roadmap saved yet')
    })

    it('saves the AI-generated plan', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      const saved = panel(wrapper, 'Saved roadmap')
      expect(saved.text()).toContain('AI-Generated Plan')
      expect(schools(saved)[0]).toBe("Cedar Girls' Secondary School")
    })

    it('asks before overwriting an existing roadmap', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await click(wrapper, 'Save Roadmap')
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('overwrite')
      expect(ui.modalDefinition?.title).toBe('Overwrite your saved roadmap?')
      // Nothing changes until the student confirms.
      expect(useRoadmapStore().saved?.source).toBe('Rule-Based Plan')
    })

    it('replaces the stored roadmap once confirmed', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await click(wrapper, 'Save Roadmap')
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      useUiStore().confirmModal()
      await flushPromises()
      expect(panel(wrapper, 'Saved roadmap').text()).toContain('AI-Generated Plan')
      expect(useUiStore().notice).toBe('Roadmap saved to your profile.')
    })

    it('keeps the old roadmap when the overwrite is cancelled', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await click(wrapper, 'Save Roadmap')
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      useUiStore().closeModal()
      await flushPromises()
      expect(useRoadmapStore().saved?.source).toBe('Rule-Based Plan')
      expect(headings(wrapper)).toContain('Rule-Based Plan')
    })
  })

  describe('editing a saved roadmap (REQ-3.5, REQ-3.13 to REQ-3.15)', () => {
    async function withSaved() {
      const mounted = await mountRoadmap()
      await generate(mounted.wrapper)
      await click(mounted.wrapper, 'Save Roadmap')
      await flushPromises()
      return mounted.wrapper
    }

    it('swaps each choice for a dropdown of eligible institutions', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      const selects = wrapper.findAll('select')
      expect(selects).toHaveLength(3)
      expect(wrapper.findAll('label').map((l) => l.text())).toEqual([
        '1st choice',
        '2nd choice',
        '3rd choice',
      ])
      expect(selects[0]!.findAll('option').map((o) => o.text())).toEqual([
        'Raffles Institution',
        "Cedar Girls' Secondary School",
        'Bukit Panjang Government High School',
        "St. Gabriel's Secondary School",
      ])
      expect(selects[0]!.element.selectedOptions[0]!.text).toBe("St. Gabriel's Secondary School")
      expect(wrapper.findAll('button').map((b) => b.text())).toContain('Save Changes')
      expect(wrapper.findAll('button').map((b) => b.text())).not.toContain('Delete Roadmap')
    })

    it('Save Changes stores the new choices and confirms', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      await wrapper.findAll('select')[0]!.setValue('7')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(schools(panel(wrapper, 'Saved roadmap'))[0]).toBe(
        'Bukit Panjang Government High School',
      )
      expect(wrapper.find('select').exists()).toBe(false)
      expect(useUiStore().notice).toBe('Roadmap updated.')
    })

    it('Cancel restores the stored version', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      await wrapper.findAll('select')[0]!.setValue('7')
      await click(wrapper, 'Cancel')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(schools(panel(wrapper, 'Saved roadmap'))[0]).toBe("St. Gabriel's Secondary School")
    })
  })

  describe('deleting a saved roadmap (REQ-3.6, REQ-3.16)', () => {
    async function withSaved() {
      const mounted = await mountRoadmap()
      await generate(mounted.wrapper)
      await click(mounted.wrapper, 'Save Roadmap')
      await flushPromises()
      return mounted.wrapper
    }

    it('asks for confirmation first', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('delRoadmap')
      expect(ui.modalDefinition?.title).toBe('Delete saved roadmap?')
      expect(headings(wrapper)).toContain('Saved roadmap')
    })

    it('removes the roadmap on confirm and returns to the empty state', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      useUiStore().confirmModal()
      await flushPromises()
      expect(headings(wrapper)).not.toContain('Saved roadmap')
      expect(wrapper.text()).toContain('No roadmap saved yet')
      expect(useUiStore().notice).toBe('Saved roadmap deleted.')
    })

    it('keeps the roadmap when the dialog is cancelled', async () => {
      const wrapper = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      useUiStore().closeModal()
      await flushPromises()
      expect(headings(wrapper)).toContain('Saved roadmap')
    })
  })
})
