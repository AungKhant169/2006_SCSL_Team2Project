import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { stubApi } from '@/test/fakeApi'
import { mountWithApp } from '@/test/helpers'
import SchoolDetailView from '../SchoolDetailView.vue'

/** The profile page of a school, on a fake server holding two reviews of Rosyth and a bookmark of it. */
async function mountDetail(schoolKey: string, signedInAs?: string) {
  const api = stubApi()
  api.addReview({
    school_id: 2,
    username: 'eastsideparent',
    text: 'Strong Chinese programme.',
    created_at: '2026-09-09T21:14:00+00:00',
  })
  api.addReview({
    school_id: 2,
    username: 'kaiyi88',
    text: 'Teachers respond quickly.',
    created_at: '2026-09-02T07:40:00+00:00',
  })
  api.bookmark('planner2026', 2)
  const mounted = await mountWithApp(SchoolDetailView, { props: { schoolKey }, signedInAs, api })
  await flushPromises()
  return mounted
}

describe('SchoolDetailView (UC-1.2)', () => {
  it('reads the school from the server by its key', async () => {
    const { api } = await mountDetail('nanyang primary')
    expect(api.callsTo('GET /school-api/nanyang primary')).toHaveLength(1)
  })

  it('shows every section of the school profile', async () => {
    const { wrapper } = await mountDetail('rosyth')
    expect(wrapper.get('h1').text()).toBe('Rosyth School')
    const headings = wrapper.findAll('h2').map((h) => h.text().replace(/\s+/g, ' '))
    expect(headings).toEqual([
      'Programmes & fees',
      'Historical entry benchmarks',
      'Financial assistance',
      'Scholarships',
      'Programmes, subjects & CCAs',
      'Reviews (2)',
    ])
    expect(wrapper.text()).toContain('2 Example Road, Singapore 100002')
    expect(wrapper.text()).toContain('Station 2')
    expect(wrapper.text()).toContain('20, 21')
  })

  it('shows what the dataset has and says "Not available" for what it lacks', async () => {
    const { wrapper } = await mountDetail('rosyth')
    // Entry figure and programmes come from the dataset ...
    expect(wrapper.text()).toContain('95 places')
    expect(wrapper.text()).toContain('Science in Action')
    expect(wrapper.text()).toContain('Higher Chinese')
    expect(wrapper.text()).toContain('Visual Arts')
    // ... fees, financial aid and scholarships are not in it.
    expect(wrapper.findAll('tbody tr').map((tr) => tr.text())).toEqual(['Not available'])
    expect(wrapper.text().match(/Not available/g)).toHaveLength(3)
  })

  it('links back to the directory', async () => {
    const { wrapper, router } = await mountDetail('rosyth')
    const back = wrapper.get('a')
    expect(back.text()).toBe('← Back to directory')
    await back.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directory')
  })

  it('shows the distance from the directory’s reference postal code', async () => {
    const { wrapper } = await mountDetail('rosyth')
    expect(wrapper.text()).toMatch(/Distance\s*1\.\d km/)
  })

  it('shows the bookmark control to signed-in students only', async () => {
    const guest = await mountDetail('rosyth')
    expect(guest.wrapper.text()).not.toContain('Saved')
    const member = await mountDetail('rosyth', 'planner2026')
    expect(member.wrapper.text()).toContain('★ Saved')
    const other = await mountDetail('nanyang primary', 'planner2026')
    expect(other.wrapper.text()).toContain('☆ Save')
  })

  it('includes the school’s reviews', async () => {
    const { wrapper } = await mountDetail('rosyth')
    expect(wrapper.text()).toContain('eastsideparent')
    expect(wrapper.text()).toContain('kaiyi88')
  })

  it('shows the next school’s data and a fresh review composer when the key changes', async () => {
    const { wrapper } = await mountDetail('nanyang primary', 'planner2026')
    await wrapper.get('textarea').setValue('draft for school one')
    await wrapper.setProps({ schoolKey: 'tao nan' })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Tao Nan School')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('')
  })

  it('ignores a slow answer for a school the visitor has already left', async () => {
    const api = stubApi()
    const release = api.hold('GET /school-api/rosyth')
    const { wrapper } = await mountWithApp(SchoolDetailView, {
      props: { schoolKey: 'rosyth' },
      api,
    })
    await wrapper.setProps({ schoolKey: 'tao nan' })
    await flushPromises()
    release()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Tao Nan School')
  })

  it('shows a loading state while the school is being fetched', async () => {
    const api = stubApi()
    const release = api.hold('GET /school-api/rosyth')
    const { wrapper } = await mountWithApp(SchoolDetailView, {
      props: { schoolKey: 'rosyth' },
      api,
    })
    expect(wrapper.get('[role="status"]').text()).toContain('Loading school')
    release()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Rosyth School')
  })

  it('explains when the school does not exist', async () => {
    const { wrapper } = await mountDetail('nowhere')
    expect(wrapper.get('h3').text()).toBe('School not found')
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.get('a').attributes('href')).toBe('/')
  })

  it('says when the school cannot be loaded and offers to try again', async () => {
    const api = stubApi()
    api.override('GET /school-api/rosyth', () => {
      throw new TypeError('Failed to fetch')
    })
    const { wrapper } = await mountWithApp(SchoolDetailView, {
      props: { schoolKey: 'rosyth' },
      api,
    })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Unable to load this school at this time. Please try again.',
    )
    api.restore('GET /school-api/rosyth')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Rosyth School')
  })
})
