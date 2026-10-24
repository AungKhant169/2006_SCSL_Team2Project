import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SchoolLogo from '../SchoolLogo.vue'

const props = (schoolKey: string, name = 'Example School', acronym = 'ES') => ({
  schoolKey,
  name,
  acronym,
})

describe('SchoolLogo (REQ-1.7)', () => {
  it('shows the school badge image with descriptive alt text', () => {
    const wrapper = mount(SchoolLogo, { props: props('rosyth', 'Rosyth School', 'RS') })
    const img = wrapper.get('img')
    expect(img.attributes('alt')).toBe('Rosyth School badge')
    expect(img.attributes('src')).toMatch(/rosyth.*\.png/)
  })

  it('finds the badge of a school whose key has spaces', () => {
    const wrapper = mount(SchoolLogo, { props: props('nanyang primary') })
    expect(wrapper.get('img').attributes('src')).toMatch(/nanyang-primary.*\.png/)
  })

  it('falls back to the acronym for a school without a badge', () => {
    const wrapper = mount(SchoolLogo, {
      props: props('admiralty primary', 'Admiralty Primary School', 'AP'),
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('AP')
    expect(wrapper.get('span').attributes('aria-label')).toBe('Admiralty Primary School badge')
  })

  it.each([
    ['sm', 'size-11'],
    ['md', 'size-[52px]'],
    ['lg', 'size-[72px]'],
  ] as const)('%s size', (size, cls) => {
    expect(mount(SchoolLogo, { props: { ...props('rosyth'), size } }).classes()).toContain(cls)
  })
})
