import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authorizedRequest } from '../authorizedRequest'
import { loadProfile, saveProfile } from '../profileService'

vi.mock('../authorizedRequest', () => ({ authorizedRequest: vi.fn() }))
const request = vi.mocked(authorizedRequest)

describe('profileService (matches the /profile API contract)', () => {
  beforeEach(() => request.mockReset())

  it('turns the stored profile into form text', async () => {
    request.mockResolvedValue({
      level: 'uni',
      score_a: 3.55,
      score_b: null,
      postal: '556000',
      primary_result: 'None',
    })
    await expect(loadProfile()).resolves.toEqual({
      level: 'uni',
      scoreA: '3.55',
      scoreB: '',
      postal: '556000',
      primaryResult: 'None',
    })
    expect(request).toHaveBeenCalledWith('/profile')
  })

  it('shows an account without a profile as an empty form', async () => {
    request.mockResolvedValue({
      level: 'secondary',
      score_a: null,
      score_b: null,
      postal: null,
      primary_result: 'None',
    })
    expect(await loadProfile()).toMatchObject({ scoreA: '', scoreB: '', postal: '' })
  })

  it('sends the form as numbers, and blanks as nothing', async () => {
    request.mockResolvedValue({
      level: 'postsec',
      score_a: 12,
      score_b: null,
      postal: '556000',
      primary_result: 'None',
    })
    await saveProfile({
      level: 'postsec',
      scoreA: '12',
      scoreB: ' ',
      postal: '556000',
      primaryResult: 'None',
    })
    expect(request).toHaveBeenCalledWith('/profile', {
      method: 'PUT',
      body: {
        level: 'postsec',
        score_a: 12,
        score_b: null,
        postal: '556000',
        primary_result: 'None',
      },
    })
  })
})
