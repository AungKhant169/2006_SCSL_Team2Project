import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHOOLS } from '@/test/fixtures'
import { authorizedRequest } from '../authorizedRequest'
import { ApiError } from '../http'
import {
  AI_TIMEOUT_MS,
  deleteSavedRoadmap,
  editSavedRoadmap,
  fetchSavedRoadmap,
  generateAiPlan,
  generateRulePlan,
  saveRoadmap,
} from '../roadmapService'

vi.mock('../authorizedRequest', () => ({ authorizedRequest: vi.fn() }))
const request = vi.mocked(authorizedRequest)

const plan = { choices: [6, 5], schools: [SCHOOLS[5], SCHOOLS[4]] }
const wanted = { stage: 'secondary', postal: '556000', score: 8 } as const

describe('roadmapService (matches the /roadmap API contract)', () => {
  beforeEach(() => request.mockReset())

  it('asks for the rule-based plan with the stage, postal code and score', async () => {
    request.mockResolvedValue(plan)
    const result = await generateRulePlan(wanted)
    expect(request).toHaveBeenCalledWith('/roadmap/generate-rule-roadmap', {
      method: 'POST',
      body: { stage: 'secondary', postal: '556000', previous_academic_score: 8 },
    })
    expect(result.choices).toEqual([6, 5])
    expect(result.schools.map((s) => s.name)).toEqual([
      "Cedar Girls' Secondary School",
      'Raffles Institution',
    ])
  })

  it('sends no score when the student has none', async () => {
    request.mockResolvedValue({ choices: [], schools: [] })
    await generateRulePlan({ ...wanted, score: null })
    expect(request.mock.calls[0]![1]?.body).toMatchObject({ previous_academic_score: null })
  })

  it('asks for the AI plan with an abort signal', async () => {
    request.mockResolvedValue(plan)
    await generateAiPlan(wanted)
    const [path, options] = request.mock.calls[0]!
    expect(path).toBe('/roadmap/generate-ai-roadmap')
    expect(options?.signal).toBeInstanceOf(AbortSignal)
  })

  it('gives the AI plan fifteen seconds by default (PERF-7)', () => {
    expect(AI_TIMEOUT_MS).toBe(15000)
  })

  it('aborts an AI plan that takes longer than the timeout', async () => {
    request.mockImplementationOnce(
      (_path, options) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new ApiError(0, 'aborted')))
        }),
    )
    await expect(generateAiPlan(wanted, 20)).rejects.toMatchObject({ status: 0 })
  })

  it('does not abort a plan that arrives in time', async () => {
    request.mockResolvedValueOnce(plan)
    await generateAiPlan(wanted, 20)
    const signal = request.mock.calls[0]![1]?.signal
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(signal?.aborted).toBe(false)
  })

  it('reads the saved roadmap with its schools', async () => {
    request.mockResolvedValue({ ...plan, stage: 'secondary', source: 'AI-Generated Plan' })
    const saved = await fetchSavedRoadmap()
    expect(request).toHaveBeenCalledWith('/roadmap')
    expect(saved).toMatchObject({
      stage: 'secondary',
      source: 'AI-Generated Plan',
      choices: [6, 5],
    })
  })

  it('is null when nothing is saved', async () => {
    request.mockRejectedValueOnce(new ApiError(404, 'No saved roadmap was found for this account.'))
    expect(await fetchSavedRoadmap()).toBeNull()
  })

  it('passes other failures on', async () => {
    request.mockRejectedValueOnce(new ApiError(500, 'oops'))
    await expect(fetchSavedRoadmap()).rejects.toMatchObject({ status: 500 })
  })

  it('saves with PUT, replacing any roadmap', async () => {
    request.mockResolvedValue({ ...plan, stage: 'secondary', source: 'Rule-Based Plan' })
    await saveRoadmap({ stage: 'secondary', source: 'Rule-Based Plan', choices: [6, 5] })
    expect(request).toHaveBeenCalledWith('/roadmap', {
      method: 'PUT',
      body: { stage: 'secondary', source: 'Rule-Based Plan', choices: [6, 5] },
    })
  })

  it('changes only the choices with PATCH', async () => {
    request.mockResolvedValue({ ...plan, stage: 'secondary', source: 'Rule-Based Plan' })
    await editSavedRoadmap([5, 6])
    expect(request).toHaveBeenCalledWith('/roadmap', { method: 'PATCH', body: { choices: [5, 6] } })
  })

  it('deletes with DELETE', async () => {
    request.mockResolvedValue(undefined)
    await deleteSavedRoadmap()
    expect(request).toHaveBeenCalledWith('/roadmap', { method: 'DELETE' })
  })
})
