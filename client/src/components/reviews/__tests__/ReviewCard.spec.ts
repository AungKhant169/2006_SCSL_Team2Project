import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Review } from '@/types/review'
import ReviewCard from '../ReviewCard.vue'

const review: Review = {
  id: 1,
  schoolId: 2,
  username: 'eastsideparent',
  createdAt: '2026-09-09T21:14:00',
  text: 'Strong Chinese programme and a very active parent support group.',
}

describe('ReviewCard (REQ-4.3, REQ-4.10)', () => {
  it('shows the username, timestamp and review text', () => {
    const wrapper = mount(ReviewCard, { props: { review } })
    expect(wrapper.text()).toContain('eastsideparent')
    expect(wrapper.text()).toContain('09 Sep 2026, 9:14 pm')
    expect(wrapper.text()).toContain(
      'Strong Chinese programme and a very active parent support group.',
    )
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-09T21:14:00')
  })

  it('has no edit or delete controls on someone else’s review', () => {
    const wrapper = mount(ReviewCard, { props: { review } })
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Your review')
  })

  describe('own review', () => {
    it('is marked as yours and offers Edit Review and Delete Review', () => {
      const wrapper = mount(ReviewCard, { props: { review, own: true } })
      expect(wrapper.text()).toContain('Your review')
      expect(wrapper.findAll('button').map((b) => b.text())).toEqual([
        'Edit Review',
        'Delete Review',
      ])
      expect(wrapper.classes()).toContain('border-primary')
    })

    it('emits edit and delete', async () => {
      const wrapper = mount(ReviewCard, { props: { review, own: true } })
      const [edit, del] = wrapper.findAll('button')
      await edit!.trigger('click')
      await del!.trigger('click')
      expect(wrapper.emitted('edit')).toHaveLength(1)
      expect(wrapper.emitted('delete')).toHaveLength(1)
    })
  })

  it('shows the edit time with an "(edited)" marker once a review has been changed', () => {
    const wrapper = mount(ReviewCard, {
      props: { review: { ...review, updatedAt: '2026-09-10T08:05:00' } },
    })
    expect(wrapper.get('time').text()).toBe('10 Sep 2026, 8:05 am (edited)')
  })

  it('treats review text as plain text, never markup (SEC-4)', () => {
    const wrapper = mount(ReviewCard, {
      props: { review: { ...review, text: '<img src=x onerror=alert(1)>' } },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
