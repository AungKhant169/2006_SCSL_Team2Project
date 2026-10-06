import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountWithApp } from '@/test/helpers'
import SchoolDetailView from '../SchoolDetailView.vue'

const mountDetail = (id: string, signedInAs?: string) =>
  mountWithApp(SchoolDetailView, { props: { id }, signedInAs })

describe('SchoolDetailView (UC-1.2)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows every section of the school profile', async () => {
    const { wrapper } = await mountDetail('9')
    expect(wrapper.get('h1').text()).toBe('Singapore Polytechnic')
    const headings = wrapper.findAll('h2').map((h) => h.text().replace(/\s+/g, ' '))
    expect(headings).toEqual([
      'Courses & fees',
      'Historical entry benchmarks',
      'Financial assistance',
      'Scholarships',
      'Reviews (1)',
    ])
    expect(wrapper.text()).toContain('500 Dover Road, Singapore 139651')
    expect(wrapper.text()).toContain('Dover (EW22)')
    expect(wrapper.text()).toContain('Singapore Poly (Stop 18101)')
  })

  it('links back to the directory', async () => {
    const { wrapper, router } = await mountDetail('9')
    const back = wrapper.get('a')
    expect(back.text()).toBe('← Back to directory')
    await back.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('opens at the singapore citizen fee tier and lets the visitor switch (BR-1)', async () => {
    const { wrapper } = await mountDetail('14')
    expect(wrapper.text()).toContain('S$9,400')
    await wrapper
      .findAll('[aria-label="Citizenship"] button')
      .find((b) => b.text() === 'International')!
      .trigger('click')
    expect(wrapper.text()).toContain('S$21,000')
    expect(wrapper.text()).not.toContain('S$9,400')
  })

  it('shows the bookmark control to signed-in students only', async () => {
    const guest = await mountDetail('2')
    expect(guest.wrapper.text()).not.toContain('Saved')
    const member = await mountDetail('2', 'planner2026')
    expect(member.wrapper.text()).toContain('★ Saved')
    const other = await mountDetail('1', 'planner2026')
    expect(other.wrapper.text()).toContain('☆ Save')
  })

  it('includes the school’s reviews', async () => {
    const { wrapper } = await mountDetail('2')
    expect(wrapper.text()).toContain('eastsideparent')
    expect(wrapper.text()).toContain('kaiyi88')
  })

  it('shows the next school’s data and a fresh review composer when the id changes', async () => {
    const { wrapper } = await mountDetail('1', 'planner2026')
    await wrapper.get('textarea').setValue('draft for school one')
    await wrapper.setProps({ id: '3' })
    expect(wrapper.get('h1').text()).toBe('Tao Nan School')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('')
  })

  it('explains when the school does not exist', async () => {
    const { wrapper } = await mountDetail('9999')
    expect(wrapper.get('h3').text()).toBe('School not found')
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.get('a').attributes('href')).toBe('/')
  })
})
