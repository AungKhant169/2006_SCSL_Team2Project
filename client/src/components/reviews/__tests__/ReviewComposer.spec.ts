import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewComposer from '../ReviewComposer.vue'

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')

function mountComposer(props: Record<string, unknown> = {}, modelValue = '') {
  const wrapper = mount(ReviewComposer, {
    props: {
      modelValue,
      'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }),
      title: 'Write a review as planner2026',
      submitLabel: 'Submit Review',
      ...props,
    },
  })
  return wrapper
}

const counter = (w: ReturnType<typeof mountComposer>) => w.get('[data-testid="word-counter"]')
const textarea = (w: ReturnType<typeof mountComposer>) => w.get<HTMLTextAreaElement>('textarea')

describe('ReviewComposer (REQ-4.2, REQ-4.6)', () => {
  it('labels the text area with the given title and offers a submit button', () => {
    const wrapper = mountComposer()
    expect(wrapper.get('label').text()).toBe('Write a review as planner2026')
    expect(wrapper.get('label').attributes('for')).toBe(textarea(wrapper).attributes('id'))
    expect(wrapper.get('button[type="submit"]').text()).toBe('Submit Review')
  })

  describe('live word counter', () => {
    it('starts at zero', () => {
      expect(counter(mountComposer()).text()).toBe('0 / 200 words')
    })

    it('counts words as the user types', async () => {
      const wrapper = mountComposer()
      await textarea(wrapper).setValue('Strong   Chinese programme')
      expect(counter(wrapper).text()).toBe('3 / 200 words')
    })

    it('counts the text of a review being edited', () => {
      expect(counter(mountComposer({}, 'one two three four')).text()).toBe('4 / 200 words')
    })

    it('turns red at the limit', async () => {
      const wrapper = mountComposer()
      expect(counter(wrapper).classes()).toContain('text-muted')
      await textarea(wrapper).setValue(words(200))
      expect(counter(wrapper).classes()).toContain('text-danger')
    })
  })

  describe('200 word cap', () => {
    it('accepts exactly 200 words', async () => {
      const wrapper = mountComposer()
      await textarea(wrapper).setValue(words(200))
      expect(counter(wrapper).text()).toBe('200 / 200 words')
      expect(textarea(wrapper).element.value).toBe(words(200))
    })

    it('stops input beyond 200 words, in the field as well as the model', async () => {
      const wrapper = mountComposer()
      await textarea(wrapper).setValue(words(230))
      expect(counter(wrapper).text()).toBe('200 / 200 words')
      expect(textarea(wrapper).element.value.trim().split(/\s+/)).toHaveLength(200)
      expect(wrapper.props('modelValue').trim().split(/\s+/)).toHaveLength(200)
    })

    it('rejects an extra word typed onto a full review even though the model does not change', async () => {
      const wrapper = mountComposer()
      await textarea(wrapper).setValue(words(200))
      await textarea(wrapper).setValue(`${words(200)} extra`)
      expect(textarea(wrapper).element.value).not.toContain('extra')
      expect(counter(wrapper).text()).toBe('200 / 200 words')
    })
  })

  it('submits through the button or the form', async () => {
    const wrapper = mountComposer()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  describe('cancel', () => {
    it('is hidden for a new review', () => {
      expect(
        mountComposer()
          .findAll('button')
          .map((b) => b.text()),
      ).toEqual(['Submit Review'])
    })

    it('is available while editing and emits cancel', async () => {
      const wrapper = mountComposer({ cancellable: true, submitLabel: 'Update Review' })
      const buttons = wrapper.findAll('button')
      expect(buttons.map((b) => b.text())).toEqual(['Cancel', 'Update Review'])
      await buttons[0]!.trigger('click')
      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('submit')).toBeUndefined()
    })
  })

  it('shows an error message when given one', () => {
    const wrapper = mountComposer({
      error: 'Review text cannot be blank or consist entirely of spaces.',
    })
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Review text cannot be blank or consist entirely of spaces.',
    )
    expect(mountComposer().find('[role="alert"]').exists()).toBe(false)
  })
})
