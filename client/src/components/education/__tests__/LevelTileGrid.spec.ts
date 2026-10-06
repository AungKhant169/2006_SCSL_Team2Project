import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LevelTileGrid from '../LevelTileGrid.vue'

describe('LevelTileGrid', () => {
  it('shows the five transition stages with their captions', () => {
    const wrapper = mount(LevelTileGrid, { props: { modelValue: 'secondary' } })
    const tiles = wrapper.findAll('button').map((b) => b.findAll('span').map((s) => s.text()))
    expect(tiles).toEqual([
      ['No school → Preschool', 'Preschool placement'],
      ['Preschool → Primary', 'P1 Registration'],
      ['Primary → Secondary', 'S1 Posting'],
      ['Secondary → Post-Secondary', 'JC / Polytechnic / ITE'],
      ['Post-Secondary → University', 'Autonomous University'],
    ])
  })

  it('highlights only the selected stage', () => {
    const wrapper = mount(LevelTileGrid, { props: { modelValue: 'postsec' } })
    const pressed = wrapper.findAll('button').map((b) => b.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'false', 'false', 'true', 'false'])
  })

  it('selects a stage on click', async () => {
    const wrapper = mount(LevelTileGrid, { props: { modelValue: 'secondary' } })
    await wrapper.findAll('button')[4]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['uni']])
  })

  it('sizes its columns from the requested minimum tile width', () => {
    const wrapper = mount(LevelTileGrid, { props: { modelValue: 'primary', minTileWidth: 190 } })
    expect(wrapper.attributes('style')).toContain('minmax(min(190px, 100%), 1fr)')
  })
})
