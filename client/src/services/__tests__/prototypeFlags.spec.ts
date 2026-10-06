import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Flags are captured at import time, so each case loads a fresh copy under its own URL. */
async function loadFlags(search: string) {
  window.history.replaceState({}, '', `/${search}`)
  vi.resetModules()
  return import('../prototypeFlags')
}

describe('prototype flags', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('default to the success outcome', async () => {
    const flags = await loadFlags('')
    expect(flags.aiOutcome()).toBe('success')
    expect(flags.adminOutcome()).toBe('success')
  })

  it('read the AI outcome from the URL', async () => {
    const flags = await loadFlags('?aiOutcome=error')
    expect(flags.aiOutcome()).toBe('error')
  })

  it.each(['timeout', 'parse'] as const)(
    'read the admin outcome %s from the URL',
    async (outcome) => {
      const flags = await loadFlags(`?adminOutcome=${outcome}`)
      expect(flags.adminOutcome()).toBe(outcome)
    },
  )

  it('ignore unknown values', async () => {
    const flags = await loadFlags('?aiOutcome=explode&adminOutcome=melt')
    expect(flags.aiOutcome()).toBe('success')
    expect(flags.adminOutcome()).toBe('success')
  })

  it('keep their value after the URL changes, so in-app navigation does not lose them', async () => {
    const flags = await loadFlags('?aiOutcome=error')
    window.history.replaceState({}, '', '/roadmap')
    expect(flags.aiOutcome()).toBe('error')
  })
})
