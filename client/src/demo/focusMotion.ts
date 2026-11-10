export interface FocusRectangle {
  top: number
  left: number
  width: number
  height: number
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function focusRectangle(target: HTMLElement): FocusRectangle | null {
  const box = target.getBoundingClientRect()
  return rectangleAt(box.top, box.left, box.width, box.height)
}

function rectangleAt(
  top: number,
  left: number,
  width: number,
  height: number,
): FocusRectangle | null {
  const clippedTop = Math.max(8, top - 8)
  const bottom = Math.min(window.innerHeight - 66, top + height + 8)
  const clippedLeft = Math.max(8, left - 8)
  const right = Math.min(window.innerWidth - 8, left + width + 8)
  return bottom > clippedTop && right > clippedLeft
    ? {
        top: clippedTop,
        left: clippedLeft,
        width: right - clippedLeft,
        height: bottom - clippedTop,
      }
    : null
}

/** One clock moves the page and spotlight together; newer steps can cancel the entire move. */
export function animateFocus(
  target: HTMLElement,
  from: FocusRectangle | null,
  onFrame: (rectangle: FocusRectangle | null) => void,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)
  const startScroll = window.scrollY
  const box = target.getBoundingClientRect()
  const availableHeight = window.innerHeight - 90
  const inset = box.height > availableHeight ? 16 : Math.max(16, (availableHeight - box.height) / 2)
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const endScroll = Math.max(0, Math.min(maxScroll, startScroll + box.top - inset))
  const end = rectangleAt(box.top + startScroll - endScroll, box.left, box.width, box.height)
  const start = from ?? end

  if (prefersReducedMotion()) {
    window.scrollTo({ top: endScroll, behavior: 'instant' })
    onFrame(focusRectangle(target))
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    let frame = 0
    let started: number | undefined
    const finish = (completed: boolean) => {
      cancelAnimationFrame(frame)
      signal.removeEventListener('abort', cancel)
      resolve(completed)
    }
    const cancel = () => finish(false)
    const tick = (now: number) => {
      if (!target.isConnected) {
        finish(false)
        return
      }
      started ??= now
      const progress = Math.min(1, (now - started) / 650)
      // Ease in and out: start gently, travel, then settle precisely on the feature.
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
      window.scrollTo({ top: startScroll + (endScroll - startScroll) * eased, behavior: 'instant' })
      onFrame(
        start && end
          ? {
              top: start.top + (end.top - start.top) * eased,
              left: start.left + (end.left - start.left) * eased,
              width: start.width + (end.width - start.width) * eased,
              height: start.height + (end.height - start.height) * eased,
            }
          : end,
      )
      if (progress < 1) frame = requestAnimationFrame(tick)
      else {
        onFrame(focusRectangle(target))
        finish(true)
      }
    }
    signal.addEventListener('abort', cancel, { once: true })
    frame = requestAnimationFrame(tick)
  })
}
