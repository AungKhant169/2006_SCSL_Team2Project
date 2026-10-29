import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useDirectoryStore } from '@/stores/directory'
import { useRoadmapStore } from '@/stores/roadmap'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import RouteJourney from '../RouteJourney.vue'

async function mountRoute(options: Parameters<typeof mountWithApp>[1] = {}) {
  const mounted = await mountWithApp(RouteJourney, { route: '/', ...options })
  await flushPromises()
  return mounted
}

const stops = (w: VueWrapper) => w.findAll('li').map((li) => li.get('.route-name').text())
const stopNamed = (w: VueWrapper, name: string) =>
  w.findAll('li').find((li) => li.text().includes(name))!
const choose = async (w: VueWrapper, stop: string) => {
  await w.get(`input[value="${stop}"]`).setValue(true)
  await flushPromises()
}
const button = (w: VueWrapper, label: string) => w.findAll('a').find((a) => a.text() === label)

describe('RouteJourney', () => {
  it('lays out one stop for each stage, from before school to university', async () => {
    const { wrapper } = await mountRoute()
    expect(stops(wrapper)).toEqual([
      'Not in school yet',
      'Preschool',
      'Primary',
      'Secondary',
      'Post-secondary',
      'University',
    ])
  })

  it('offers every stop but the last as a place to be, as radio buttons', async () => {
    const { wrapper } = await mountRoute()
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.map((r) => r.attributes('value'))).toEqual([
      'start',
      'preschool',
      'primary',
      'secondary',
      'postsec',
    ])
    expect(wrapper.get('legend').text()).toBe('Where are you now?')
  })

  it('opens at primary school, heading for S1 Posting', async () => {
    const { wrapper } = await mountRoute()
    expect(stopNamed(wrapper, 'Primary').attributes('data-state')).toBe('here')
    expect(stopNamed(wrapper, 'Primary').text()).toContain('You are here')
    expect(stopNamed(wrapper, 'Secondary').attributes('data-state')).toBe('next')
    expect(wrapper.get('h2').text()).toBe('S1 Posting')
    expect(wrapper.text()).toContain('Enter your PSLE Achievement Level aggregate.')
    expect(wrapper.text()).toContain('PSLE T-score cut-off')
  })

  it('moves "you are here" and the next stop when another stop is chosen', async () => {
    const { wrapper } = await mountRoute()
    await choose(wrapper, 'secondary')
    expect(wrapper.findAll('.route-here')).toHaveLength(1)
    expect(stopNamed(wrapper, 'Secondary').text()).toContain('You are here')
    expect(wrapper.findAll('li').map((li) => li.attributes('data-state'))).toEqual([
      'past',
      'past',
      'past',
      'here',
      'next',
      'ahead',
    ])
    expect(wrapper.findAll('.route-rail').map((r) => r.attributes('data-rail'))).toEqual([
      'past',
      'past',
      'past',
      'hop',
      'ahead',
    ])
    expect(wrapper.get('h2').text()).toBe('JC / Polytechnic / ITE')
    expect(wrapper.text()).toContain('JAE cut-off')
  })

  it('shows the school count under each stop that is in the directory', async () => {
    const { wrapper } = await mountRoute()
    expect(stopNamed(wrapper, 'Primary').text()).toContain('4 schools')
    expect(stopNamed(wrapper, 'Secondary').text()).toContain('4 schools')
    expect(stopNamed(wrapper, 'Preschool').find('.route-count').exists()).toBe(false)
  })

  it('still works when the counts cannot be loaded', async () => {
    const api = stubApi()
    api.override('GET /school-api', () => {
      throw new TypeError('Failed to fetch')
    })
    const { wrapper } = await mountRoute({ api })
    expect(wrapper.find('.route-count').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('S1 Posting')
  })

  describe('browsing schools', () => {
    it('names the tier the student is heading for', async () => {
      const { wrapper } = await mountRoute()
      expect(button(wrapper, 'Browse secondary schools')).toBeTruthy()
      await choose(wrapper, 'secondary')
      expect(button(wrapper, 'Browse post-secondary schools')).toBeTruthy()
      await choose(wrapper, 'postsec')
      expect(button(wrapper, 'Browse universities')).toBeTruthy()
    })

    it('has nothing to browse for preschool, which the directory does not list', async () => {
      const { wrapper } = await mountRoute()
      await choose(wrapper, 'start')
      expect(wrapper.get('h2').text()).toBe('Preschool placement')
      expect(wrapper.findAll('a').map((a) => a.text())).toEqual(['Build my roadmap'])
    })

    it('opens the directory on that tier', async () => {
      const { wrapper, router } = await mountRoute()
      await choose(wrapper, 'postsec')
      await button(wrapper, 'Browse universities')!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('directory')
      expect(useDirectoryStore().tier).toBe('uni')
    })
  })

  describe('as a guest', () => {
    it('says the roadmap needs a login, and sends the guest there when it is chosen', async () => {
      const { wrapper, router } = await mountRoute()
      expect(wrapper.text()).toContain(
        "Roadmaps need an account, so you'll be asked to log in first.",
      )
      await button(wrapper, 'Build my roadmap')!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('signed in', () => {
    it('drops the login note', async () => {
      const { wrapper } = await mountRoute({ signedInAs: 'planner2026' })
      expect(wrapper.text()).not.toContain('Roadmaps need an account')
    })

    it('starts on the step the profile targets', async () => {
      const api = stubApi()
      api.profiles['planner2026'] = {
        level: 'uni',
        score_a: null,
        score_b: null,
        postal: '556000',
        primary_result: 'None',
      }
      const { wrapper } = await mountRoute({ api, signedInAs: 'planner2026' })
      expect(stopNamed(wrapper, 'Post-secondary').text()).toContain('You are here')
      expect(wrapper.get('h2').text()).toBe('Autonomous University')
    })

    it('opens the roadmap on the step chosen here', async () => {
      const { wrapper, router } = await mountRoute({ signedInAs: 'planner2026' })
      await choose(wrapper, 'secondary')
      await button(wrapper, 'Build my roadmap')!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('roadmap')
      expect(useRoadmapStore().stage).toBe('postsec')
    })
  })
})
