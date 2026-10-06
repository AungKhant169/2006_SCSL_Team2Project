import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useReviewsStore } from '@/stores/reviews'
import { useUiStore } from '@/stores/ui'
import { mountWithApp } from '@/test/helpers'
import ReviewSection from '../ReviewSection.vue'

type Mounted = Awaited<ReturnType<typeof mountWithApp>>
type Wrapper = Mounted['wrapper']

const mountSection = (schoolId: number, signedInAs?: string) =>
  mountWithApp(ReviewSection, { props: { schoolId }, signedInAs })

const cardUsers = (wrapper: Wrapper) =>
  wrapper.findAll('article').map((a) => a.find('span.font-bold').text())
const buttonLabels = (wrapper: Wrapper) => wrapper.findAll('button').map((b) => b.text())
const type = (wrapper: Wrapper, text: string) => wrapper.get('textarea').setValue(text)
const submit = (wrapper: Wrapper) => wrapper.get('form').trigger('submit')
const heading = (wrapper: Wrapper) => wrapper.get('h2').text().replace(/\s+/g, ' ')

describe('ReviewSection (UC-4.1 to UC-4.4)', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('viewing (UC-4.2)', () => {
    it('lists reviews newest first with a count', async () => {
      const { wrapper } = await mountSection(2)
      expect(heading(wrapper)).toBe('Reviews (2)')
      expect(wrapper.text()).toContain('One review per school per account · newest first')
      expect(cardUsers(wrapper)).toEqual(['eastsideparent', 'kaiyi88'])
    })

    it.each([
      ['a guest', undefined],
      ['a signed-in student', 'planner2026'],
    ])('shows "No reviews yet" to %s when the school has none (REQ-4.11)', async (_who, user) => {
      const { wrapper } = await mountSection(1, user)
      expect(wrapper.text()).toContain('No reviews yet')
      expect(heading(wrapper)).toBe('Reviews (0)')
    })

    it('hides the empty message once there are reviews', async () => {
      const { wrapper } = await mountSection(2)
      expect(wrapper.text()).not.toContain('No reviews yet')
    })
  })

  describe('guest (BR-2)', () => {
    it('sees the account-holders-only gate instead of a composer, with reviews still visible', async () => {
      const { wrapper } = await mountSection(2)
      expect(wrapper.text()).toContain('Reviews are open to account holders only.')
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(buttonLabels(wrapper)).toEqual(['Write a review'])
      expect(cardUsers(wrapper)).toHaveLength(2)
    })

    it('Write a review asks them to log in or create an account (REQ-4.5)', async () => {
      const { wrapper } = await mountSection(2)
      await wrapper.get('button').trigger('click')
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('guestReview')
      expect(ui.modalDefinition?.body).toBe('Please log in or create an account to post a review.')
    })

    it('confirming the prompt opens the login page with an explanation', async () => {
      const { wrapper, router } = await mountSection(2)
      await wrapper.get('button').trigger('click')
      useUiStore().confirmModal()
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('login')
      expect(useUiStore().notice).toBe('Log in or create an account to post a review.')
    })

    it('dismissing the prompt leaves them on the page', async () => {
      const { wrapper, router } = await mountSection(2)
      await router.push('/schools/2')
      await wrapper.get('button').trigger('click')
      useUiStore().closeModal()
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/schools/2')
    })
  })

  describe('submitting (UC-4.1)', () => {
    it('shows a composer addressed to the signed-in student', async () => {
      const { wrapper } = await mountSection(2, 'planner2026')
      expect(wrapper.get('label').text()).toBe('Write a review as planner2026')
      expect(wrapper.find('[data-testid="word-counter"]').text()).toBe('0 / 200 words')
      expect(wrapper.text()).not.toContain('open to account holders only')
    })

    it('posts the review at the top of the list and swaps the composer for their own card', async () => {
      const { wrapper } = await mountSection(2, 'planner2026')
      await type(wrapper, 'Great CCA options and caring teachers.')
      await submit(wrapper)
      expect(heading(wrapper)).toBe('Reviews (3)')
      expect(cardUsers(wrapper)).toEqual(['planner2026', 'eastsideparent', 'kaiyi88'])
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(wrapper.text()).toContain('Your review')
      expect(wrapper.text()).toContain('Great CCA options and caring teachers.')
      expect(buttonLabels(wrapper)).toEqual(['Edit Review', 'Delete Review'])
    })

    it('works for a school with no reviews and clears the empty message', async () => {
      const { wrapper } = await mountSection(1, 'planner2026')
      await type(wrapper, 'First!')
      await submit(wrapper)
      expect(wrapper.text()).not.toContain('No reviews yet')
      expect(heading(wrapper)).toBe('Reviews (1)')
    })

    it.each(['', '     '])(
      'refuses blank text %j with the prescribed message (REQ-4.6)',
      async (text) => {
        const { wrapper } = await mountSection(2, 'planner2026')
        await type(wrapper, text)
        await submit(wrapper)
        expect(wrapper.get('[role="alert"]').text()).toBe(
          'Review text cannot be blank or consist entirely of spaces.',
        )
        expect(heading(wrapper)).toBe('Reviews (2)')
        expect(wrapper.find('textarea').exists()).toBe(true)
      },
    )

    it('clears the error once a valid review goes through', async () => {
      const { wrapper } = await mountSection(2, 'planner2026')
      await submit(wrapper)
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      await type(wrapper, 'Fine')
      await submit(wrapper)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('strips HTML before storing (REQ-4.4)', async () => {
      const { wrapper } = await mountSection(2, 'planner2026')
      await type(wrapper, '<b>Bold</b> claim<script>x()</script>')
      await submit(wrapper)
      expect(useReviewsStore().ownReview(2, 'planner2026')?.text).toBe('Bold claimx()')
      expect(wrapper.find('script').exists()).toBe(false)
    })
  })

  describe('own review (REQ-4.7 to REQ-4.10)', () => {
    // The seed data already contains a review by kaiyi88 for school 2.
    const mountOwn = () => mountSection(2, 'kaiyi88')

    it('replaces the composer with their review card, Edit and Delete only on that card', async () => {
      const { wrapper } = await mountOwn()
      expect(wrapper.find('textarea').exists()).toBe(false)
      // Their own card is pinned above everyone else's.
      expect(cardUsers(wrapper)).toEqual(['kaiyi88', 'eastsideparent'])
      expect(buttonLabels(wrapper)).toEqual(['Edit Review', 'Delete Review'])
      expect(wrapper.text()).toContain('Your review')
    })

    it('Edit Review reopens the text with a live counter and Update / Cancel', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[0]!.trigger('click')
      const textarea = wrapper.get<HTMLTextAreaElement>('textarea')
      expect(wrapper.get('label').text()).toBe('Edit your review')
      expect(textarea.element.value).toContain('Teachers respond quickly on the parent portal.')
      expect(wrapper.get('[data-testid="word-counter"]').text()).toMatch(/^\d+ \/ 200 words$/)
      expect(buttonLabels(wrapper)).toEqual(['Cancel', 'Update Review'])
      expect(wrapper.findAll('article')).toHaveLength(1)
    })

    it('Update Review saves the change and marks it edited', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[0]!.trigger('click')
      await type(wrapper, 'Updated opinion.')
      await submit(wrapper)
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(wrapper.text()).toContain('Updated opinion.')
      expect(wrapper.text()).toContain('(edited)')
      expect(heading(wrapper)).toBe('Reviews (2)')
    })

    it('rejects a blank edit and keeps the original', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[0]!.trigger('click')
      await type(wrapper, '   ')
      await submit(wrapper)
      expect(wrapper.get('[role="alert"]').text()).toMatch(/cannot be blank/)
      expect(useReviewsStore().ownReview(2, 'kaiyi88')?.text).toContain('Teachers respond quickly')
    })

    it('Cancel discards the changes and restores the saved review (REQ-4.8)', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[0]!.trigger('click')
      await type(wrapper, 'Something else entirely')
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Cancel')!
        .trigger('click')
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(wrapper.text()).toContain('Teachers respond quickly on the parent portal.')
      expect(wrapper.text()).not.toContain('Something else entirely')
      expect(wrapper.text()).not.toContain('(edited)')
    })

    it('Delete Review asks for confirmation before removing anything (REQ-4.9)', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[1]!.trigger('click')
      const ui = useUiStore()
      expect(ui.modal?.id).toBe('delReview')
      expect(heading(wrapper)).toBe('Reviews (2)')
    })

    it('confirming deletes the review and brings the composer back', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[1]!.trigger('click')
      useUiStore().confirmModal()
      await flushPromises()
      expect(heading(wrapper)).toBe('Reviews (1)')
      expect(cardUsers(wrapper)).toEqual(['eastsideparent'])
      expect(wrapper.get('label').text()).toBe('Write a review as kaiyi88')
    })

    it('cancelling the confirmation keeps the review', async () => {
      const { wrapper } = await mountOwn()
      await wrapper.findAll('button')[1]!.trigger('click')
      useUiStore().closeModal()
      await flushPromises()
      expect(heading(wrapper)).toBe('Reviews (2)')
      expect(buttonLabels(wrapper)).toEqual(['Edit Review', 'Delete Review'])
    })

    it('does not show Edit/Delete on other people’s reviews', async () => {
      const { wrapper } = await mountSection(2, 'planner2026')
      expect(wrapper.findAll('article button')).toHaveLength(0)
    })
  })
})
