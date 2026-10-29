import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { PlanNode } from '@/types/roadmap'
import PlanNodeList from '../PlanNodeList.vue'

const nodes: PlanNode[] = [
  {
    step: 1,
    label: '1st choice',
    schoolName: 'Rosyth School',
    detail: 'P1 Phase 2C ratio: 2.4 : 1',
    latitude: 1.375,
    longitude: 103.885,
  },
  {
    step: 2,
    label: '2nd choice',
    schoolName: 'Tao Nan School',
    detail: 'P1 Phase 2C ratio: 1.8 : 1',
    latitude: 1.305,
    longitude: 103.91,
  },
]

describe('PlanNodeList', () => {
  it('states the starting point as plain text rather than as a school node', () => {
    const wrapper = mount(PlanNodeList, { props: { nodes, from: 'Preschool (current)' } })
    expect(wrapper.text()).toContain('Starting from')
    expect(wrapper.text()).toContain('Preschool (current) — currently enrolled, per your profile')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('numbers each choice with its label, school and detail', () => {
    const wrapper = mount(PlanNodeList, { props: { nodes, from: 'x' } })
    const first = wrapper.findAll('li')[0]!
    expect(first.text()).toContain('1')
    expect(first.text()).toContain('1st choice')
    expect(first.text()).toContain('Rosyth School')
    expect(first.text()).toContain('P1 Phase 2C ratio: 2.4 : 1')
  })

  it('uses the primary colour by default and purple for the AI plan', () => {
    const marker = (tone?: 'primary' | 'ai') =>
      mount(PlanNodeList, { props: { nodes, from: 'x', tone } }).get('li span')
    expect(marker().classes()).toContain('text-primary')
    expect(marker('ai').classes()).toContain('text-ai')
  })

  it('explains when a stage has no institutions to choose from', () => {
    const wrapper = mount(PlanNodeList, { props: { nodes: [], from: 'No school (current)' } })
    expect(wrapper.find('ol').exists()).toBe(false)
    expect(wrapper.text()).toContain('No institutions are available for this stage yet.')
  })

  it('says what it is told when there are no institutions to list', () => {
    const empty = 'No schools are within 1 km of 556000. Try a larger distance.'
    const wrapper = mount(PlanNodeList, { props: { nodes: [], from: 'x', empty } })
    expect(wrapper.text()).toContain(empty)
    expect(wrapper.text()).not.toContain('No institutions are available')
  })

  it('leaves out the detail of a school there is nothing to say of', () => {
    const bare = [{ ...nodes[0]!, detail: '' }]
    const wrapper = mount(PlanNodeList, { props: { nodes: bare, from: 'x' } })
    // Only the choice's label and the school's name are left.
    expect(wrapper.findAll('li .flex-col span').map((span) => span.text())).toEqual([
      '1st choice',
      'Rosyth School',
    ])
  })
})
