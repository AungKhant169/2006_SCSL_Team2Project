import { prefersReducedMotion } from './focusMotion'
import type { DemoAutomation } from './script'

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
    await wait(45, signal)
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
    if (input) await type(input, action === 'search' ? 'RI' : 'zzzz', signal)
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
  }
}
