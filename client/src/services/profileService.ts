import type { PrimaryResult } from '@/types/profile'
import type { TierId } from '@/types/school'
import { authorizedRequest } from './authorizedRequest'

/** The profile as the form edits it: scores and the postal code are text until validated. */
export interface ProfileForm {
  level: TierId
  scoreA: string
  scoreB: string
  postal: string
  primaryResult: PrimaryResult
}

interface ProfilePayload {
  level: TierId
  score_a: number | null
  score_b: number | null
  postal: string | null
  primary_result: PrimaryResult
}

const toText = (score: number | null) => (score === null ? '' : String(score))
const toScore = (text: string) => (text.trim() === '' ? null : Number(text))

function toForm(payload: ProfilePayload): ProfileForm {
  return {
    level: payload.level,
    scoreA: toText(payload.score_a),
    scoreB: toText(payload.score_b),
    postal: payload.postal ?? '',
    primaryResult: payload.primary_result,
  }
}

/** The signed-in student's saved profile, or the starting values of an account without one. */
export async function loadProfile(): Promise<ProfileForm> {
  return toForm(await authorizedRequest<ProfilePayload>('/profile'))
}

export async function saveProfile(profile: ProfileForm): Promise<ProfileForm> {
  return toForm(
    await authorizedRequest<ProfilePayload>('/profile', {
      method: 'PUT',
      body: {
        level: profile.level,
        score_a: toScore(profile.scoreA),
        score_b: toScore(profile.scoreB),
        postal: profile.postal,
        primary_result: profile.primaryResult,
      },
    }),
  )
}
