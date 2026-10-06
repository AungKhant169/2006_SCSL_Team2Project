import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { jsonResponse, mountWithApp, stubAuthApi } from '@/test/helpers'
import LoginView from '../LoginView.vue'

const username = (w: VueWrapper) => w.get<HTMLInputElement>('input[autocomplete="username"]')
const password = (w: VueWrapper) => w.get<HTMLInputElement>('input[type="password"]')
const submitButton = (w: VueWrapper) => w.get('button[type="submit"]')
const tab = (w: VueWrapper, label: string) =>
  w.findAll('[aria-label="Account mode"] button').find((b) => b.text() === label)!
const alertText = (w: VueWrapper) => w.find('[role="alert"]').text()

async function fill(w: VueWrapper, user: string, pass: string) {
  await username(w).setValue(user)
  await password(w).setValue(pass)
}

async function mountLogin(overrides: Parameters<typeof stubAuthApi>[0] = {}) {
  const fetchMock = stubAuthApi(overrides)
  const mounted = await mountWithApp(LoginView, { route: '/login' })
  return { ...mounted, fetchMock }
}

describe('LoginView (UC-2.1, UC-2.2)', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('login form', () => {
    it('opens on the Log in tab asking only for a username and password (REQ-2.5, SEC-1)', async () => {
      const { wrapper } = await mountLogin()
      expect(wrapper.get('h1').text()).toBe('Welcome back')
      expect(wrapper.findAll('input')).toHaveLength(2)
      expect(wrapper.text()).toContain(
        'Only a username and password. We never collect names, dates of birth or NRIC/FIN.',
      )
      expect(submitButton(wrapper).text()).toBe('Log in')
      expect(tab(wrapper, 'Log in').attributes('aria-pressed')).toBe('true')
    })

    it('does not show the password checklist while logging in', async () => {
      const { wrapper } = await mountLogin()
      expect(wrapper.find('[aria-label="Password requirements"]').exists()).toBe(false)
    })

    it('limits input to what the API accepts', async () => {
      const { wrapper } = await mountLogin()
      expect(username(wrapper).attributes('maxlength')).toBe('36')
      expect(password(wrapper).attributes('maxlength')).toBe('36')
    })

    it('asks for a username, then a password', async () => {
      const { wrapper, fetchMock } = await mountLogin()
      await wrapper.get('form').trigger('submit')
      expect(alertText(wrapper)).toBe('Enter a username.')
      await username(wrapper).setValue('planner2026')
      await wrapper.get('form').trigger('submit')
      expect(alertText(wrapper)).toBe('Enter your password.')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('signs in and lands on the profile page', async () => {
      const { wrapper, router, fetchMock } = await mountLogin()
      await fill(wrapper, 'planner2026', 'abcd123!')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit]
      expect(url).toContain('/user/login')
      expect(JSON.parse(String(init.body))).toEqual({
        username: 'planner2026',
        password: 'abcd123!',
      })
      expect(useAuthStore().loggedIn).toBe(true)
      expect(router.currentRoute.value.name).toBe('profile')
      expect(useUiStore().notice).toBe('')
    })

    it('sends the admin account straight to the admin panel (BR-5)', async () => {
      const { wrapper, router } = await mountLogin()
      await fill(wrapper, 'admin', 'abcd123!')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(useAuthStore().isAdmin).toBe(true)
      expect(router.currentRoute.value.name).toBe('admin')
    })

    it('shows the server’s message for wrong credentials and stays on the page', async () => {
      const { wrapper, router } = await mountLogin({
        '/user/login': () =>
          jsonResponse({ detail: 'The password entered is incorrect. Please try again.' }, 401),
      })
      await fill(wrapper, 'planner2026', 'wrongpass1!')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(alertText(wrapper)).toBe('The password entered is incorrect. Please try again.')
      expect(useAuthStore().loggedIn).toBe(false)
      expect(router.currentRoute.value.name).toBe('login')
    })

    it('shows a generic message when the server cannot be reached', async () => {
      const { wrapper } = await mountLogin()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
      await fill(wrapper, 'planner2026', 'abcd123!')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(alertText(wrapper)).toBe(
        'Unable to complete your request at this time. Please try again later.',
      )
    })

    it('clears the error as soon as the form is edited', async () => {
      const { wrapper } = await mountLogin()
      await wrapper.get('form').trigger('submit')
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      await username(wrapper).setValue('p')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('locks the button while the request is in flight', async () => {
      let release!: () => void
      const { wrapper } = await mountLogin()
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              release = () =>
                resolve(
                  jsonResponse({ access_token: 'a', refresh_token: 'r', token_type: 'bearer' }),
                )
            }),
        ),
      )
      await fill(wrapper, 'planner2026', 'abcd123!')
      await wrapper.get('form').trigger('submit')
      expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
      release()
      await flushPromises()
      expect(useAuthStore().busy).toBe(false)
    })
  })

  describe('create account', () => {
    async function mountSignup() {
      const mounted = await mountLogin()
      await tab(mounted.wrapper, 'Create account').trigger('click')
      return mounted
    }

    it('switches the same card to registration', async () => {
      const { wrapper } = await mountSignup()
      expect(wrapper.get('h1').text()).toBe('Create your account')
      expect(submitButton(wrapper).text()).toBe('Create account')
      expect(tab(wrapper, 'Create account').attributes('aria-pressed')).toBe('true')
      expect(wrapper.findAll('input')).toHaveLength(2)
    })

    it('checks the three password rules live', async () => {
      const { wrapper } = await mountSignup()
      const met = () =>
        wrapper
          .findAll('[aria-label="Password requirements"] li')
          .map((li) => li.attributes('data-met'))
      expect(met()).toEqual(['false', 'false', 'false'])
      await password(wrapper).setValue('abcdefg1')
      expect(met()).toEqual(['true', 'true', 'false'])
      await password(wrapper).setValue('abcdef1!')
      expect(met()).toEqual(['true', 'true', 'true'])
    })

    it.each(['user*name', 'john#1', 'two words'])(
      'blocks username %j with the prescribed message and sends nothing (REQ-2.18)',
      async (name) => {
        const { wrapper, fetchMock } = await mountSignup()
        await fill(wrapper, name, 'abcd123!')
        await wrapper.get('form').trigger('submit')
        expect(alertText(wrapper)).toBe(
          'Username cannot contain special characters. Please use only letters and numbers.',
        )
        expect(fetchMock).not.toHaveBeenCalled()
      },
    )

    it.each(['short1!', 'nodigitshere!', 'nospecial123'])(
      'blocks weak password %j until every rule passes (SEC-2)',
      async (pass) => {
        const { wrapper, fetchMock } = await mountSignup()
        await fill(wrapper, 'planner2026', pass)
        await wrapper.get('form').trigger('submit')
        expect(alertText(wrapper)).toBe(
          'Password must be at least 8 characters long and contain at least one number and one special character.',
        )
        expect(fetchMock).not.toHaveBeenCalled()
      },
    )

    it('registers, signs the user in and opens the profile with a welcome notice', async () => {
      const { wrapper, router, fetchMock } = await mountSignup()
      await fill(wrapper, 'newplanner', 'abcd123!')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/user/register')
      expect(useAuthStore().username).toBe('newplanner')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(useUiStore().notice).toBe(
        'Account created. Set your target level and postal code to get started.',
      )
    })

    it('refuses a username that is already taken (REQ-2.15)', async () => {
      const mounted = await mountLogin({
        '/user/register': () =>
          jsonResponse(
            { detail: 'This username is already taken. Please choose a different username.' },
            409,
          ),
      })
      await tab(mounted.wrapper, 'Create account').trigger('click')
      await fill(mounted.wrapper, 'admin', 'abcd123!')
      await mounted.wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(alertText(mounted.wrapper)).toBe(
        'This username is already taken. Please choose a different username.',
      )
      expect(useAuthStore().loggedIn).toBe(false)
    })

    it('switching tabs clears any error', async () => {
      const { wrapper } = await mountSignup()
      await wrapper.get('form').trigger('submit')
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      await tab(wrapper, 'Log in').trigger('click')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })
})
