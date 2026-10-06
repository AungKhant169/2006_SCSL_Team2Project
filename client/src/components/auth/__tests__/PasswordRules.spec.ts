import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordRules from '../PasswordRules.vue'

const state = (password: string) => {
  const wrapper = mount(PasswordRules, { props: { password } })
  return wrapper
    .findAll('li')
    .map((li) => [li.text().replace(/[✓·]/, '').trim(), li.attributes('data-met')])
}

describe('PasswordRules (REQ-2.3)', () => {
  it('lists the three complexity rules, all unmet for an empty password', () => {
    expect(state('')).toEqual([
      ['At least 8 characters', 'false'],
      ['Contains a number', 'false'],
      ['Contains a special character', 'false'],
    ])
  })

  it('ticks rules off live as they are satisfied', () => {
    expect(state('abcdefgh').map((r) => r[1])).toEqual(['true', 'false', 'false'])
    expect(state('abcdefg1').map((r) => r[1])).toEqual(['true', 'true', 'false'])
    expect(state('abcdef1!').map((r) => r[1])).toEqual(['true', 'true', 'true'])
  })

  it('marks short passwords as failing the length rule even when they have digits and symbols', () => {
    expect(state('a1!').map((r) => r[1])).toEqual(['false', 'true', 'true'])
  })

  it('shows a check mark for met rules and a dot for unmet ones', () => {
    const wrapper = mount(PasswordRules, { props: { password: 'abc1' } })
    const marks = wrapper.findAll('li span').map((s) => s.text())
    expect(marks).toEqual(['·', '✓', '·'])
  })
})
