import { prefersReducedMotion } from './focusMotion'
import type { DemoAutomation } from './script'
import { DEMO_SEARCH_TERM } from './script'

export const DEMO_TYPING_INTERVAL_MS = 110
const SIGNIN_EXAMPLES = {
  signin: { username: 'demostudent', password: 'DemoPass123!' },
  'admin-signin': { username: 'demoadmin', password: 'DemoPass123!' },
} as const

function wait(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  if (prefersReducedMotion()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = () => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }
    const timer = setTimeout(done, ms)
    const cancel = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      reject(new DOMException('Demo action cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', cancel, { once: true })
  })
}

async function click(element: HTMLElement, signal: AbortSignal) {
  signal.throwIfAborted()
  const box = element.getBoundingClientRect()
  const ring = document.createElement('span')
  ring.className = 'demo-click-ring'
  ring.setAttribute('aria-hidden', 'true')
  ring.style.left = `${box.left + box.width / 2}px`
  ring.style.top = `${box.top + box.height / 2}px`
  document.body.append(ring)
  try {
    await wait(140, signal)
    signal.throwIfAborted()
    element.click()
    await wait(420, signal)
  } finally {
    ring.remove()
  }
}

async function type(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  element.focus({ preventScroll: true })
  const update = (value: string) => {
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (prefersReducedMotion()) {
    update(text)
    return
  }
  update('')
  for (let length = 1; length <= text.length; length++) {
    await wait(DEMO_TYPING_INTERVAL_MS, signal)
    signal.throwIfAborted()
    if (!element.isConnected) return
    update(text.slice(0, length))
  }
}

/** Only rehearsed, reversible UI examples. Never submits a form, review, upload or saved plan. */
export async function playDemoActions(action: DemoAutomation | undefined, signal: AbortSignal) {
  if (!action) return
  if (action === 'home') {
    const label = document
      .querySelector<HTMLElement>('input[name="route-origin"][value="secondary"]')
      ?.closest('label')
    if (label) await click(label, signal)
  } else if (action === 'tiers') {
    for (const name of ['Secondary', 'Post-Secondary', 'Secondary']) {
      const button = [
        ...document.querySelectorAll<HTMLElement>('[aria-label="Education tier"] button'),
      ].find((item) => item.textContent?.trim() === name)
      if (button) await click(button, signal)
    }
  } else if (action === 'search' || action === 'empty') {
    const input = document.querySelector<HTMLInputElement>(
      '[data-demo="directory-filters"] input[placeholder^="School name"]',
    )
    if (input) await type(input, action === 'search' ? DEMO_SEARCH_TERM : 'zzzz', signal)
  } else if (action === 'review') {
    const input = document.querySelector<HTMLTextAreaElement>(
      '[data-demo="school-reviews"] textarea',
    )
    // Never erase a presenter's draft or edit an existing review.
    if (input && !input.value)
      await type(
        input,
        'The campus is easy to reach, and the staff were helpful during our visit.',
        signal,
      )
  } else if (action === 'signin' || action === 'admin-signin') {
    const form = document.querySelector<HTMLFormElement>('[data-demo="login"] form')
    const username = form?.querySelector<HTMLInputElement>('input[autocomplete="username"]')
    const password = form?.querySelector<HTMLInputElement>('input[type="password"]')
    // These are visual examples, never real credentials or an automatic authentication request.
    // Preserve anything the presenter or their password manager has already entered.
    if (!form || !username || !password || username.value || password.value) return
    const login = [
      ...form.querySelectorAll<HTMLElement>('[aria-label="Account mode"] button'),
    ].find((button) => button.textContent?.trim() === 'Log in')
    if (login && login.getAttribute('aria-pressed') !== 'true') await click(login, signal)
    await click(username, signal)
    await type(username, SIGNIN_EXAMPLES[action].username, signal)
    await wait(600, signal)
    if (!password.isConnected) return
    await click(password, signal)
    await type(password, SIGNIN_EXAMPLES[action].password, signal)
  }
}
