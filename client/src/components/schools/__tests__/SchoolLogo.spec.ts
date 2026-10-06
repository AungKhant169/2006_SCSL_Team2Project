import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SCHOOLS } from '@/data/schools'
import SchoolLogo from '../SchoolLogo.vue'

const props = (id: number) => {
  const school = SCHOOLS.find((s) => s.id === id)!
  return { schoolId: school.id, name: school.name, acronym: school.acronym }
}

describe('SchoolLogo (REQ-1.7)', () => {
  it('shows the school badge image with descriptive alt text', () => {
    const wrapper = mount(SchoolLogo, { props: props(2) })
    const img = wrapper.get('img')
    expect(img.attributes('alt')).toBe('Rosyth School badge')
    expect(img.attributes('src')).toMatch(/2.*\.png/)
  })

  it('has a badge for most schools; the rest fall back to their acronym', () => {
    const withoutLogo = [13, 17]
    for (const school of SCHOOLS) {
      const wrapper = mount(SchoolLogo, { props: props(school.id) })
      expect(wrapper.find('img').exists()).toBe(!withoutLogo.includes(school.id))
    }
    const kaplan = mount(SchoolLogo, { props: props(17) })
    expect(kaplan.text()).toBe('KHE')
    expect(kaplan.get('span').attributes('aria-label')).toBe(
      'Kaplan Higher Education (Private) badge',
    )
  })

  it.each([
    ['sm', 'size-11'],
    ['md', 'size-[52px]'],
    ['lg', 'size-[72px]'],
  ] as const)('%s size', (size, cls) => {
    expect(mount(SchoolLogo, { props: { ...props(2), size } }).classes()).toContain(cls)
  })
})
