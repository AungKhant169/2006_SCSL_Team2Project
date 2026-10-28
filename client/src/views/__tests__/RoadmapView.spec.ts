import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useProfileStore } from '@/stores/profile'
import { useRoadmapStore } from '@/stores/roadmap'
import { useUiStore } from '@/stores/ui'
import { stubApi } from '@/test/fakeApi'
import type { FakeApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import RoadmapView from '../RoadmapView.vue'

/**
 * The roadmap page of a student whose stored profile targets S1 posting (AL 8, postal 556000).
 * The fake server ranks secondary schools by distance as St. Gabriel's, Raffles, Cedar Girls'
 * for the rule-based plan, and by name as Bukit Panjang, Cedar Girls', Raffles for the AI plan.
 */
async function mountRoadmap(configure: (api: FakeApi) => void = () => {}) {
  const api = stubApi()
  api.profiles['planner2026'] = {
    level: 'secondary',
    score_a: 8,
    score_b: null,
    postal: '556000',
    primary_result: 'None',
  }
  configure(api)
  const mounted = await mountWithApp(RoadmapView, {
    route: '/roadmap',
    signedInAs: 'planner2026',
    api,
  })
  await flushPromises()
  return mounted
}

const button = (w: VueWrapper, label: string) =>
  w.findAll('button').find((b) => b.text() === label)!
const click = async (w: VueWrapper, label: string) => {
  await button(w, label).trigger('click')
  await flushPromises()
}
const stageTile = (w: VueWrapper, label: string) =>
  w.findAll('button[aria-pressed]').find((b) => b.text().includes(label))!
const headings = (w: VueWrapper) => w.findAll('h2, h3').map((h) => h.text())
const schools = (panel: ReturnType<VueWrapper['get']>) =>
  panel.findAll('ol li span.font-semibold').map((s) => s.text())
const panel = (w: VueWrapper, title: string) =>
  w.findAll('section').find((s) => s.find('h2')?.text() === title)!

async function generate(w: VueWrapper) {
  await click(w, 'Generate Roadmap')
}

describe('RoadmapView (UC-3.1 to UC-3.4)', () => {
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

    it('shows the roadmap the account saved earlier', async () => {
      const { wrapper } = await mountRoadmap((api) => {
        api.roadmaps['planner2026'] = {
          stage: 'secondary',
          source: 'AI-Generated Plan',
          choices: [6, 5],
        }
      })
      const saved = panel(wrapper, 'Saved roadmap')
      expect(saved.text()).toContain('Primary → Secondary · AI-Generated Plan')
      expect(schools(saved)).toEqual(["Cedar Girls' Secondary School", 'Raffles Institution'])
      expect(wrapper.text()).not.toContain('No roadmap saved yet')
    })
  })

  describe('generating (REQ-3.1, REQ-3.12)', () => {
    it('is blocked without a valid postal code, offering a way to fix it', async () => {
      const { wrapper, router, api } = await mountRoadmap()
      useProfileStore().setPostal('12')
      await generate(wrapper)
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('postal')
      expect(ui.modalDefinition?.title).toBe('Missing Profile Information')
      expect(ui.modalDefinition?.body).toBe(
        'Please enter your postal code in your profile before generating a roadmap.',
      )
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(0)

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

    it('rule-based plan lists the three nearest eligible schools', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      const rule = panel(wrapper, 'Rule-Based Plan')
      expect(schools(rule)).toEqual([
        "St. Gabriel's Secondary School",
        'Raffles Institution',
        "Cedar Girls' Secondary School",
      ])
      expect(rule.text()).toContain('Starting from')
      expect(rule.text()).toContain(
        'Primary school (current) — currently enrolled, per your profile',
      )
      expect(rule.text()).toMatch(/PSLE T-score cut-off: T-score ≥ 205 · \d\.\d km from 556000/)
      expect(rule.text()).toContain('Applies the Primary → Secondary rule set')
    })

    it('rule-based plan shows its own loading state, and the AI plan is not held up by it', async () => {
      const { wrapper, api } = await mountRoadmap()
      const release = api.hold('POST /roadmap/generate-rule-roadmap')
      await generate(wrapper)
      const rule = panel(wrapper, 'Rule-Based Plan')
      expect(rule.find('[role="status"]').exists()).toBe(true)
      expect(rule.text()).not.toContain('Save Roadmap')
      expect(schools(panel(wrapper, 'AI-Generated Plan'))).toHaveLength(3)
      release()
      await flushPromises()
      expect(schools(panel(wrapper, 'Rule-Based Plan'))).toHaveLength(3)
    })

    it('AI plan shows its own loading state, then the plan (REQ-3.7, QUAL-6)', async () => {
      const { wrapper, api } = await mountRoadmap()
      const release = api.hold('POST /roadmap/generate-ai-roadmap')
      await generate(wrapper)
      const ai = () => panel(wrapper, 'AI-Generated Plan')
      expect(ai().find('[role="status"]').exists()).toBe(true)
      expect(ai().text()).toContain('Generating an alternative pathway from your profile')
      expect(ai().text()).not.toContain('Save Roadmap')
      // The rule-based plan is already usable while the AI panel loads.
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain('Save Roadmap')

      release()
      await flushPromises()
      expect(ai().find('[role="status"]').exists()).toBe(false)
      expect(schools(ai())).toEqual([
        'Bukit Panjang Govt. High School',
        "Cedar Girls' Secondary School",
        'Raffles Institution',
      ])
      expect(ai().text()).toContain('An alternative ordering from an AI model')
    })

    it('uses the stage-specific pool for another stage (REQ-3.2)', async () => {
      const { wrapper } = await mountRoadmap()
      await stageTile(wrapper, 'JC / Polytechnic / ITE').trigger('click')
      await generate(wrapper)
      expect(schools(panel(wrapper, 'Rule-Based Plan'))).toEqual([
        'Raffles Institution',
        'Eunoia Junior College',
        'Temasek Junior College',
      ])
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain('Secondary school (current)')
    })

    it('says so when the chosen stage has no institutions yet', async () => {
      const { wrapper } = await mountRoadmap()
      await stageTile(wrapper, 'Autonomous University').trigger('click')
      await generate(wrapper)
      expect(panel(wrapper, 'Rule-Based Plan').text()).toContain(
        'No institutions are available for this stage yet.',
      )
      // There is nothing to save.
      expect(panel(wrapper, 'Rule-Based Plan').get('button').attributes('disabled')).toBeDefined()
    })

    it('changing the stage discards a generated plan', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await stageTile(wrapper, 'P1 Registration').trigger('click')
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(wrapper.text()).toContain('No roadmap saved yet')
    })
  })

  describe('map of the recommended schools', () => {
    const pins = (section: ReturnType<VueWrapper['get']>) =>
      section.findAll('.leaflet-marker-icon').map((pin) => pin.attributes('aria-label'))

    it('pins each plan’s schools, and the postal district they are measured from', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      expect(pins(panel(wrapper, 'Rule-Based Plan'))).toEqual([
        'Your postal district',
        "1st choice: St. Gabriel's Secondary School",
        '2nd choice: Raffles Institution',
        "3rd choice: Cedar Girls' Secondary School",
      ])
      expect(pins(panel(wrapper, 'AI-Generated Plan'))).toEqual([
        'Your postal district',
        '1st choice: Bukit Panjang Govt. High School',
        "2nd choice: Cedar Girls' Secondary School",
        '3rd choice: Raffles Institution',
      ])
    })

    it('colours the AI plan’s pins purple and the rule-based plan’s blue', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      expect(panel(wrapper, 'Rule-Based Plan').findAll('.map-pin-primary')).toHaveLength(3)
      expect(panel(wrapper, 'AI-Generated Plan').findAll('.map-pin-ai')).toHaveLength(3)
    })

    it('keeps a failed plan’s panel free of a map, and the other plan’s intact', async () => {
      const { wrapper } = await mountRoadmap((api) => {
        api.ai = 'error'
      })
      await generate(wrapper)
      expect(panel(wrapper, 'AI-Generated Plan').find('.leaflet-container').exists()).toBe(false)
      expect(pins(panel(wrapper, 'Rule-Based Plan'))).toHaveLength(4)
    })

    it('draws no map for a stage that has no institutions', async () => {
      const { wrapper } = await mountRoadmap()
      await stageTile(wrapper, 'Autonomous University').trigger('click')
      await generate(wrapper)
      expect(wrapper.find('.leaflet-container').exists()).toBe(false)
    })

    it('shows the saved roadmap on a map too, until it is being edited', async () => {
      const { wrapper } = await mountRoadmap((api) => {
        api.roadmaps['planner2026'] = {
          stage: 'secondary',
          source: 'AI-Generated Plan',
          choices: [6, 5],
        }
      })
      const saved = () => panel(wrapper, 'Saved roadmap')
      expect(pins(saved())).toEqual([
        'Your postal district',
        "1st choice: Cedar Girls' Secondary School",
        '2nd choice: Raffles Institution',
      ])

      await click(wrapper, 'Edit Roadmap')
      expect(saved().find('.leaflet-container').exists()).toBe(false)
      await click(wrapper, 'Cancel')
      expect(pins(saved())).toHaveLength(3)
    })
  })

  describe('failures stay inside their own panel (REQ-3.8, REQ-3.9, QUAL-7)', () => {
    async function failedAi() {
      const mounted = await mountRoadmap((api) => {
        api.ai = 'error'
      })
      await generate(mounted.wrapper)
      return mounted
    }

    it('shows the prescribed message and a retry control in the AI panel only', async () => {
      const { wrapper } = await failedAi()
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
      const { wrapper, api } = await failedAi()
      const ruleBefore = panel(wrapper, 'Rule-Based Plan').html()
      api.ai = 'ok'
      await click(wrapper, 'Retry AI Generation')
      expect(api.callsTo('POST /roadmap/generate-ai-roadmap')).toHaveLength(2)
      expect(api.callsTo('POST /roadmap/generate-rule-roadmap')).toHaveLength(1)
      expect(schools(panel(wrapper, 'AI-Generated Plan'))).toHaveLength(3)
      expect(panel(wrapper, 'Rule-Based Plan').html()).toBe(ruleBefore)
    })

    it('the rule-based plan can still be saved while the AI plan has failed', async () => {
      const { wrapper } = await failedAi()
      await click(wrapper, 'Save Roadmap')
      expect(wrapper.text()).toContain('Saved roadmap')
      expect(wrapper.text()).toContain('Primary → Secondary · Rule-Based Plan')
    })

    it('a rule-based failure shows its own retry control and leaves the AI plan alone', async () => {
      const { wrapper, api } = await mountRoadmap((server) => {
        server.override('POST /roadmap/generate-rule-roadmap', () => {
          throw new TypeError('Failed to fetch')
        })
      })
      await generate(wrapper)
      const rule = panel(wrapper, 'Rule-Based Plan')
      expect(rule.get('[role="alert"]').text()).toContain(
        'Unable to generate the rule-based plan at this time. Please try again.',
      )
      expect(schools(panel(wrapper, 'AI-Generated Plan'))).toHaveLength(3)

      api.restore('POST /roadmap/generate-rule-roadmap')
      await click(wrapper, 'Retry')
      expect(schools(panel(wrapper, 'Rule-Based Plan'))).toHaveLength(3)
    })
  })

  describe('saving (REQ-3.4, REQ-3.10, REQ-3.11)', () => {
    it('saves the rule-based plan and shows it as the saved roadmap with a confirmation', async () => {
      const { wrapper, api } = await mountRoadmap()
      await generate(wrapper)
      await panel(wrapper, 'Rule-Based Plan').get('button').trigger('click')
      await flushPromises()
      const saved = panel(wrapper, 'Saved roadmap')
      expect(saved.text()).toContain('Primary → Secondary · Rule-Based Plan')
      expect(schools(saved)).toEqual([
        "St. Gabriel's Secondary School",
        'Raffles Institution',
        "Cedar Girls' Secondary School",
      ])
      expect(saved.findAll('button').map((b) => b.text())).toEqual([
        'Edit Roadmap',
        'Delete Roadmap',
      ])
      expect(useUiStore().notice).toBe('Roadmap saved to your profile.')
      expect(headings(wrapper)).not.toContain('Rule-Based Plan')
      expect(wrapper.text()).not.toContain('No roadmap saved yet')
      expect(api.roadmaps['planner2026']).toEqual({
        stage: 'secondary',
        source: 'Rule-Based Plan',
        choices: [8, 5, 6],
      })
    })

    it('saves the AI-generated plan', async () => {
      const { wrapper } = await mountRoadmap()
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      await flushPromises()
      const saved = panel(wrapper, 'Saved roadmap')
      expect(saved.text()).toContain('AI-Generated Plan')
      expect(schools(saved)[0]).toBe('Bukit Panjang Govt. High School')
    })

    it('tells the student when the roadmap could not be saved, and keeps the plans', async () => {
      const { wrapper, api } = await mountRoadmap()
      await generate(wrapper)
      api.override('PUT /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      await panel(wrapper, 'Rule-Based Plan').get('button').trigger('click')
      await flushPromises()
      expect(useUiStore().notice).toMatch(/Unable to complete your request/)
      expect(headings(wrapper)).toContain('Rule-Based Plan')
      expect(useRoadmapStore().saved).toBeNull()
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
      const { wrapper, api } = await mountRoadmap()
      await generate(wrapper)
      await click(wrapper, 'Save Roadmap')
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      useUiStore().confirmModal()
      await flushPromises()
      expect(panel(wrapper, 'Saved roadmap').text()).toContain('AI-Generated Plan')
      expect(useUiStore().notice).toBe('Roadmap saved to your profile.')
      expect(api.roadmaps['planner2026']?.source).toBe('AI-Generated Plan')
    })

    it('keeps the old roadmap when the overwrite is cancelled', async () => {
      const { wrapper, api } = await mountRoadmap()
      await generate(wrapper)
      await click(wrapper, 'Save Roadmap')
      await generate(wrapper)
      await panel(wrapper, 'AI-Generated Plan').get('button').trigger('click')
      useUiStore().closeModal()
      await flushPromises()
      expect(useRoadmapStore().saved?.source).toBe('Rule-Based Plan')
      expect(api.roadmaps['planner2026']?.source).toBe('Rule-Based Plan')
      expect(headings(wrapper)).toContain('Rule-Based Plan')
    })
  })

  describe('editing a saved roadmap (REQ-3.5, REQ-3.13 to REQ-3.15)', () => {
    async function withSaved() {
      const mounted = await mountRoadmap()
      await generate(mounted.wrapper)
      await click(mounted.wrapper, 'Save Roadmap')
      return mounted
    }

    it('swaps each choice for a dropdown of eligible institutions', async () => {
      const { wrapper } = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      const selects = wrapper.findAll('select')
      expect(selects).toHaveLength(3)
      expect(wrapper.findAll('label').map((l) => l.text())).toEqual([
        '1st choice',
        '2nd choice',
        '3rd choice',
      ])
      expect(selects[0]!.findAll('option').map((o) => o.text())).toEqual([
        'Bukit Panjang Govt. High School',
        "Cedar Girls' Secondary School",
        'Raffles Institution',
        "St. Gabriel's Secondary School",
      ])
      expect(selects[0]!.element.selectedOptions[0]!.text).toBe("St. Gabriel's Secondary School")
      expect(wrapper.findAll('button').map((b) => b.text())).toContain('Save Changes')
      expect(wrapper.findAll('button').map((b) => b.text())).not.toContain('Delete Roadmap')
    })

    it('Save Changes stores the new choices and confirms', async () => {
      const { wrapper, api } = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      await wrapper.findAll('select')[0]!.setValue('7')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(schools(panel(wrapper, 'Saved roadmap'))[0]).toBe('Bukit Panjang Govt. High School')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(useUiStore().notice).toBe('Roadmap updated.')
      expect(api.roadmaps['planner2026']?.choices).toEqual([7, 5, 6])
    })

    it('tells the student when the changes could not be saved, and keeps the editor open', async () => {
      const { wrapper, api } = await withSaved()
      await click(wrapper, 'Edit Roadmap')
      await wrapper.findAll('select')[0]!.setValue('7')
      api.override('PATCH /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(useUiStore().notice).toMatch(/Unable to complete your request/)
      expect(wrapper.find('select').exists()).toBe(true)
    })

    it('Cancel restores the stored version', async () => {
      const { wrapper } = await withSaved()
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
      return mounted
    }

    it('asks for confirmation first', async () => {
      const { wrapper } = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('delRoadmap')
      expect(ui.modalDefinition?.title).toBe('Delete saved roadmap?')
      expect(headings(wrapper)).toContain('Saved roadmap')
    })

    it('removes the roadmap on confirm and returns to the empty state', async () => {
      const { wrapper, api } = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      useUiStore().confirmModal()
      await flushPromises()
      expect(headings(wrapper)).not.toContain('Saved roadmap')
      expect(wrapper.text()).toContain('No roadmap saved yet')
      expect(useUiStore().notice).toBe('Saved roadmap deleted.')
      expect(api.roadmaps['planner2026']).toBeUndefined()
    })

    it('keeps the roadmap when the dialog is cancelled', async () => {
      const { wrapper } = await withSaved()
      await click(wrapper, 'Delete Roadmap')
      useUiStore().closeModal()
      await flushPromises()
      expect(headings(wrapper)).toContain('Saved roadmap')
    })

    it('keeps the roadmap and says why when the server refuses', async () => {
      const { wrapper, api } = await withSaved()
      api.override('DELETE /roadmap', () => {
        throw new TypeError('Failed to fetch')
      })
      await click(wrapper, 'Delete Roadmap')
      useUiStore().confirmModal()
      await flushPromises()
      expect(headings(wrapper)).toContain('Saved roadmap')
      expect(useUiStore().notice).toMatch(/Unable to complete your request/)
    })
  })
})
