import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playDemoActions } from '../actions'

describe('rehearsed typing and click cues', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('types through intermediate values and stops immediately when paused', async () => {
    document.body.innerHTML =
      '<section data-demo="directory-filters"><input placeholder="School name or acronym"></section>'
    const input = document.querySelector('input')!
    const values: string[] = []
    input.addEventListener('input', () => values.push(input.value))
    const controller = new AbortController()
    const played = playDemoActions('empty', controller.signal).catch((error) => error.name)
    await vi.advanceTimersByTimeAsync(50)
    expect(input.value).toBe('z')
    controller.abort()
    expect(await played).toBe('AbortError')
    await vi.advanceTimersByTimeAsync(1000)
    expect(input.value).toBe('z')
    expect(values).toEqual(['', 'z'])
  })

  it('shows click feedback, then activates only the rehearsed home control', async () => {
    document.body.innerHTML =
      '<label><input name="route-origin" type="radio" value="secondary">Secondary</label><button>Submit</button>'
    const submit = vi.fn()
    document.querySelector('button')!.addEventListener('click', submit)
    const played = playDemoActions('home', new AbortController().signal)
    expect(document.querySelector('.demo-click-ring')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(600)
    await played
    expect(document.querySelector<HTMLInputElement>('input')!.checked).toBe(true)
    expect(document.querySelector('.demo-click-ring')).toBeNull()
    expect(submit).not.toHaveBeenCalled()
  })

  it('preserves an existing review draft and never submits the form', async () => {
    document.body.innerHTML =
      '<section data-demo="school-reviews"><form><textarea>My own draft</textarea><button>Submit Review</button></form></section>'
    const submit = vi.fn()
    document.querySelector('form')!.addEventListener('submit', submit)
    await playDemoActions('review', new AbortController().signal)
    expect(document.querySelector('textarea')!.value).toBe('My own draft')
    expect(submit).not.toHaveBeenCalled()
  })

  it('completes typing immediately for reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    document.body.innerHTML =
      '<section data-demo="directory-filters"><input placeholder="School name"></section>'
    await playDemoActions('search', new AbortController().signal)
    expect(document.querySelector('input')!.value).toBe('RI')
  })
})
