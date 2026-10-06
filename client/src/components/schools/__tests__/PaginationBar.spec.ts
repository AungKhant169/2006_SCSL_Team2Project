import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationBar from '../PaginationBar.vue'

const buttons = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button')

describe('PaginationBar (10 per page)', () => {
  it('states the position and the page size', () => {
    const wrapper = mount(PaginationBar, { props: { page: 2, pageCount: 5 } })
    expect(wrapper.text()).toContain('Page 2 of 5 · 10 per page')
  })

  it('emits previous and next from the middle of the list', async () => {
    const wrapper = mount(PaginationBar, { props: { page: 2, pageCount: 3 } })
    await buttons(wrapper)[0]!.trigger('click')
    await buttons(wrapper)[1]!.trigger('click')
    expect(wrapper.emitted('previous')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('disables Previous on the first page', () => {
    const wrapper = mount(PaginationBar, { props: { page: 1, pageCount: 3 } })
    expect(buttons(wrapper)[0]!.attributes('disabled')).toBeDefined()
    expect(buttons(wrapper)[1]!.attributes('disabled')).toBeUndefined()
  })

  it('disables Next on the last page', () => {
    const wrapper = mount(PaginationBar, { props: { page: 3, pageCount: 3 } })
    expect(buttons(wrapper)[0]!.attributes('disabled')).toBeUndefined()
    expect(buttons(wrapper)[1]!.attributes('disabled')).toBeDefined()
  })

  it('disables both when there is a single page', () => {
    const wrapper = mount(PaginationBar, { props: { page: 1, pageCount: 1 } })
    expect(buttons(wrapper).every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})
