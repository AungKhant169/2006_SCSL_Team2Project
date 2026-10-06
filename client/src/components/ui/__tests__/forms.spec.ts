import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '../BaseInput.vue'
import BaseSelect from '../BaseSelect.vue'
import BaseTextarea from '../BaseTextarea.vue'
import FormField from '../FormField.vue'

describe('BaseInput', () => {
  it('reflects and updates its v-model', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        modelValue: 'abc',
        'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }),
      },
    })
    const input = wrapper.get('input')
    expect(input.element.value).toBe('abc')
    await input.setValue('abcd')
    expect(wrapper.props('modelValue')).toBe('abcd')
  })

  it('passes native attributes through to the input', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '' },
      attrs: { placeholder: 'e.g. planner2026', maxlength: 36, inputmode: 'numeric' },
    })
    const input = wrapper.get('input')
    expect(input.attributes()).toMatchObject({
      placeholder: 'e.g. planner2026',
      maxlength: '36',
      inputmode: 'numeric',
    })
  })

  it('marks itself invalid with the error border', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', invalid: true } })
    expect(wrapper.get('input').classes()).toContain('field-control-invalid')
  })
})

describe('BaseSelect', () => {
  const options = [
    { value: 'any', label: 'Any distance' },
    { value: '1', label: 'Within 1 km' },
  ]

  it('renders one option per entry and selects the current value', () => {
    const wrapper = mount(BaseSelect, { props: { modelValue: '1', options } })
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Any distance', 'Within 1 km'])
    expect(wrapper.get('select').element.value).toBe('1')
  })

  it('updates the model when another option is picked', async () => {
    const wrapper = mount(BaseSelect, { props: { modelValue: 'any', options } })
    await wrapper.get('select').setValue('1')
    expect(wrapper.emitted('update:modelValue')).toEqual([['1']])
  })
})

describe('BaseTextarea', () => {
  it('emits the typed text', async () => {
    const wrapper = mount(BaseTextarea, { props: { modelValue: '' } })
    await wrapper.get('textarea').setValue('Great school')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Great school']])
  })
})

describe('FormField', () => {
  const mountField = (props: Record<string, unknown> = {}) =>
    mount(FormField, {
      props: { label: 'Username', ...props },
      slots: {
        default: `<template #default="{ id, describedBy, invalid }">
          <input :id="id" :aria-describedby="describedBy" :data-invalid="invalid" />
        </template>`,
      },
    })

  it('links the label to the control it wraps', () => {
    const wrapper = mountField()
    const label = wrapper.get('label')
    expect(label.text()).toBe('Username')
    expect(label.attributes('for')).toBe(wrapper.get('input').attributes('id'))
  })

  it('shows a hint and associates it with the control', () => {
    const wrapper = mountField({ hint: 'Letters and numbers only.' })
    const hint = wrapper.get('.field-hint')
    expect(hint.text()).toBe('Letters and numbers only.')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('announces an error and flags the control invalid', () => {
    const wrapper = mountField({ error: 'Enter a username.' })
    expect(wrapper.get('[role="alert"]').text()).toBe('Enter a username.')
    expect(wrapper.get('input').attributes('data-invalid')).toBe('true')
  })

  it('renders neither hint nor error when none is given', () => {
    const wrapper = mountField()
    expect(wrapper.find('.field-hint').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('uses the compact upper-case style for filter bars', () => {
    expect(mountField({ caps: true }).get('label').classes()).toContain('field-label-caps')
    expect(mountField().get('label').classes()).toContain('field-label')
  })
})
