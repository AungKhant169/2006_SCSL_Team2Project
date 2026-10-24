// Global test setup. Individual specs create their own Pinia / router instances.
import { afterEach, vi } from 'vitest'

// jsdom does not implement scrolling; the router calls it on every navigation.
window.scrollTo = () => {}

// Specs stub `fetch` with a fake API; none of them should leak it into the next spec.
afterEach(() => vi.unstubAllGlobals())
