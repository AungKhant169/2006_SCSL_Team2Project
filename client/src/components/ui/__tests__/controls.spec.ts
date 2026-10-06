import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../BaseButton.vue'
import OptionTile from '../OptionTile.vue'
import SegmentedControl from '../SegmentedControl.vue'

describe('BaseButton', () => {
  it('renders its content as a non-submitting button by default', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Save profile' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.text()).toBe('Save profile')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('applies the variant and size classes', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'outline-danger', size: 'sm' } })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['btn', 'btn-outline-danger', 'btn-sm']),
    )
    expect(mount(BaseButton).classes()).toContain('btn-primary')
    expect(mount(BaseButton, { props: { size: 'lg' } }).classes()).toContain('btn-lg')
  })

  it('can submit forms', () => {
    expect(mount(BaseButton, { props: { type: 'submit' } }).attributes('type')).toBe('submit')
  })

  it('emits click and honours disabled', async () => {
    const enabled = mount(BaseButton)
    await enabled.trigger('click')
    expect(enabled.emitted('click')).toHaveLength(1)

    const disabled = mount(BaseButton, { attrs: { disabled: true } })
    expect(disabled.attributes('disabled')).toBeDefined()
    await disabled.trigger('click')
    expect(disabled.emitted('click')).toBeUndefined()
  })
})

describe('SegmentedControl', () => {
  const options = [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'uni', label: 'University' },
  ]

  it('renders every option and marks only the selected one', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'secondary', options } })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Primary', 'Secondary', 'University'])
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(buttons[1]!.classes()).toContain('segmented-item-active')
  })

  it('selects an option on click', async () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'primary', options } })
    await wrapper.findAll('button')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['uni']])
  })

  it.each([
    ['outlined', 'segmented-outlined'],
    ['tinted', 'segmented'],
    ['switch', 'segmented'],
  ] as const)('%s variant uses the %s container', (variant, containerClass) => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'primary', options, variant } })
    expect(wrapper.classes()).toContain(containerClass)
    expect(wrapper.get('button').classes().includes('segmented-item-raised')).toBe(
      variant === 'switch',
    )
  })

  it('exposes an accessible group name', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'primary', options, label: 'Education tier' },
    })
    expect(wrapper.attributes('aria-label')).toBe('Education tier')
  })
})

describe('OptionTile', () => {
  it('shows the tag and label and reports its pressed state', () => {
    const wrapper = mount(OptionTile, {
      props: { tag: 'Primary → Secondary', label: 'S1 Posting', active: true },
    })
    expect(wrapper.text()).toContain('Primary → Secondary')
    expect(wrapper.text()).toContain('S1 Posting')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('option-tile-active')
  })

  it('is inactive by default and emits click', async () => {
    const wrapper = mount(OptionTile, { props: { tag: 't', label: 'l' } })
    expect(wrapper.classes()).not.toContain('option-tile-active')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
