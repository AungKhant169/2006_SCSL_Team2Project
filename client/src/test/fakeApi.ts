import { vi } from 'vitest'

import { HOME, SCHOOLS } from './fixtures'
import type { ServerSchool } from './fixtures'

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const noContent = () => new Response(null, { status: 204 })
const problem = (status: number, detail: string) => jsonResponse({ detail }, status)

/** One request the fake server received. */
export interface Call {
  method: string
  path: string
  query: URLSearchParams
  /** The parsed JSON body, or the FormData of an upload. */
  body: unknown
  token: string | null
  signal: AbortSignal | null | undefined
}

type Handler = (call: Call) => Response | Promise<Response>

interface ReviewRow {
  id: number
  school_id: number
  username: string
  text: string
  created_at: string
  updated_at: string | null
}

interface RoadmapRow {
  stage: string
  source: string
  choices: number[]
}

interface ProfileRow {
  level: string
  score_a: number | null
  score_b: number | null
  postal: string | null
  primary_result: string
}

/** Where the fake server places postal codes, by their first two digits. */
const SECTORS: Record<string, { district: string; latitude: number; longitude: number }> = {
  '55': { district: 'Serangoon Garden, Hougang, Punggol', ...HOME },
  '60': { district: 'Jurong', latitude: 1.333, longitude: 103.743 },
}

const STARTING_PROFILE: ProfileRow = {
  level: 'secondary',
  score_a: null,
  score_b: null,
  postal: null,
  primary_result: 'None',
}

export const DATASET_LAST_UPDATE = '2026-10-20T06:30:00+00:00'
/** What the fake server names the exported file. */
export const DATASET_EXPORT_FILENAME = 'pathsg_schools_20261024.csv'

export type AiMode = 'ok' | 'error' | 'hang'
export type DatasetOutcome = 'success' | 'parse' | 'database' | 'running'
export type ExportOutcome = 'success' | 'unavailable'

/**
 * A stand-in for the PathSG server, behind a stubbed `fetch`. It keeps the state a real server
 * would (accounts, reviews, bookmarks, profile, roadmap, the school dataset), so tests drive the
 * real services and stores through it and then assert on what the server holds.
 */
export class FakeApi {
  readonly fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) =>
    this.handle(input, init),
  )
  readonly calls: Call[] = []

  schools: ServerSchool[] = SCHOOLS.map((school) => ({ ...school }))
  reviews: ReviewRow[] = []
  bookmarks: Record<string, number[]> = {}
  profiles: Record<string, ProfileRow> = {}
  roadmaps: Record<string, RoadmapRow> = {}
  datasetRecords = 2418
  datasetLastUpdate: string | null = DATASET_LAST_UPDATE
  /** How the AI roadmap generator behaves. */
  ai: AiMode = 'ok'
  /** How the next dataset update ends. */
  datasetOutcome: DatasetOutcome = 'success'
  /** How the next dataset export ends. */
  exportOutcome: ExportOutcome = 'success'

  private sequence = 0
  private accessTokens = new Map<string, string>()
  private refreshTokens = new Map<string, string>()
  private overrides = new Map<string, Handler>()
  private holds = new Map<string, Promise<void>>()

  /** Replaces a route with a handler of the test's own, e.g. to make login fail. */
  override(route: string, handler: Handler) {
    this.overrides.set(route, handler)
  }

  /** Puts a route back to the fake server's own behaviour. */
  restore(route: string) {
    this.overrides.delete(route)
  }

  /** Makes requests to a route wait until the returned function is called. */
  hold(route: string): () => void {
    let release!: () => void
    this.holds.set(route, new Promise<void>((resolve) => (release = resolve)))
    return () => {
      release()
      this.holds.delete(route)
    }
  }

  /** The calls made to a route, e.g. "POST /roadmap/generate-ai-roadmap". */
  callsTo(route: string): Call[] {
    return this.calls.filter((call) => `${call.method} ${call.path}` === route)
  }

  /** Makes every access token issued so far expire, so the next call to need one gets a 401. */
  expireAccessTokens() {
    this.accessTokens.clear()
  }

  addReview(row: Partial<ReviewRow> & Pick<ReviewRow, 'school_id' | 'username' | 'text'>) {
    const review: ReviewRow = {
      id: 100 + this.reviews.length + 1,
      created_at: '2026-09-09T21:14:00+00:00',
      updated_at: null,
      ...row,
    }
    this.reviews.push(review)
    return review
  }

  bookmark(username: string, ...ids: number[]) {
    this.bookmarks[username] = [...(this.bookmarks[username] ?? []), ...ids]
  }

  private issue(username: string) {
    const access = `access-${username}-${++this.sequence}`
    const refresh = `refresh-${username}-${this.sequence}`
    this.accessTokens.set(access, username)
    this.refreshTokens.set(refresh, username)
    return { access_token: access, refresh_token: refresh, token_type: 'bearer' }
  }

  private roleOf(username: string) {
    return username === 'admin' ? 'admin' : 'user'
  }

  private async handle(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    const url = new URL(String(input), 'http://localhost')
    const headers = new Headers(init.headers)
    let body: unknown = undefined
    if (init.body instanceof FormData) body = init.body
    else if (typeof init.body === 'string') body = JSON.parse(init.body)
    const call: Call = {
      method: (init.method ?? 'GET').toUpperCase(),
      path: decodeURIComponent(url.pathname),
      query: url.searchParams,
      body,
      token: headers.get('Authorization')?.replace(/^Bearer /, '') ?? null,
      signal: init.signal,
    }
    this.calls.push(call)

    const route = `${call.method} ${call.path}`
    await this.holds.get(route)
    const handler = this.overrides.get(route) ?? this.route(call)
    return handler ? handler(call) : problem(404, 'Not found')
  }

  /** The signed-in user, or the 401 response the server gives everyone else. */
  private auth(call: Call, then: (username: string) => Response | Promise<Response>) {
    const username = call.token ? this.accessTokens.get(call.token) : undefined
    return username ? then(username) : problem(401, 'Your session is invalid. Please log in again.')
  }

  private adminOnly(call: Call, then: () => Response | Promise<Response>) {
    return this.auth(call, (username) =>
      this.roleOf(username) === 'admin'
        ? then()
        : problem(403, 'This action is restricted to administrator accounts.'),
    )
  }

  private route(call: Call): Handler | undefined {
    const { method, path } = call
    const match = (pattern: RegExp) => pattern.exec(path)

    if (method === 'POST' && path === '/user/login') return () => this.login(call)
    if (method === 'POST' && path === '/user/register') return () => this.login(call)
    if (method === 'POST' && path === '/user/logout') {
      return () => {
        this.refreshTokens.delete((call.body as { refresh_token: string }).refresh_token)
        return noContent()
      }
    }
    if (method === 'POST' && path === '/user/refresh') return () => this.refresh(call)
    if (method === 'GET' && path === '/user/identity') {
      return () =>
        this.auth(call, (username) =>
          jsonResponse({ id: 1, username, role: this.roleOf(username) }),
        )
    }

    if (method === 'GET' && path === '/school-api') return () => this.listSchools(call)
    const school = method === 'GET' ? match(/^\/school-api\/(.+)$/) : null
    if (school) {
      const key = school[1]
      return () => {
        const found = this.schools.find((s) => s.school_key === key)
        return found ? jsonResponse(found) : problem(404, 'This school could not be found.')
      }
    }
    if (method === 'GET' && match(/^\/location\/(\d+)$/)) {
      return () => this.locate(match(/^\/location\/(\d+)$/)![1]!)
    }

    if (method === 'GET' && match(/^\/review\/school\/(\d+)$/)) {
      const schoolId = Number(match(/^\/review\/school\/(\d+)$/)![1])
      return () =>
        jsonResponse(
          this.reviews
            .filter((r) => r.school_id === schoolId)
            .slice()
            .reverse(),
        )
    }
    if (method === 'POST' && match(/^\/review\/school\/(\d+)$/)) {
      const schoolId = Number(match(/^\/review\/school\/(\d+)$/)![1])
      return () => this.auth(call, (username) => this.postReview(call, username, schoolId))
    }
    if (match(/^\/review\/(\d+)$/) && (method === 'PATCH' || method === 'DELETE')) {
      const id = Number(match(/^\/review\/(\d+)$/)![1])
      return () => this.auth(call, (username) => this.changeReview(call, username, id))
    }

    if (method === 'GET' && path === '/bookmark') {
      return () =>
        this.auth(call, (username) =>
          jsonResponse(
            (this.bookmarks[username] ?? []).map((id) => this.schools.find((s) => s.id === id)),
          ),
        )
    }
    if (match(/^\/bookmark\/(\d+)$/) && (method === 'PUT' || method === 'DELETE')) {
      const id = Number(match(/^\/bookmark\/(\d+)$/)![1])
      return () => this.auth(call, (username) => this.changeBookmark(call, username, id))
    }

    if (path === '/profile' && method === 'GET') {
      return () =>
        this.auth(call, (username) => jsonResponse(this.profiles[username] ?? STARTING_PROFILE))
    }
    if (path === '/profile' && method === 'PUT') {
      return () => this.auth(call, (username) => this.saveProfile(call, username))
    }

    if (method === 'POST' && path === '/roadmap/generate-rule-roadmap') {
      return () => this.auth(call, () => this.generate(call, 'rule'))
    }
    if (method === 'POST' && path === '/roadmap/generate-ai-roadmap') {
      return () => this.auth(call, () => this.generate(call, 'ai'))
    }
    if (path === '/roadmap')
      return () => this.auth(call, (username) => this.roadmap(call, username))

    if (method === 'GET' && path === '/admin/dataset') {
      return () =>
        this.adminOnly(call, () =>
          jsonResponse({ records: this.datasetRecords, last_update: this.datasetLastUpdate }),
        )
    }
    if (method === 'POST' && path === '/admin/dataset/update') {
      return () => this.adminOnly(call, () => this.updateDataset(call))
    }
    if (method === 'GET' && path === '/admin/dataset/export') {
      return () => this.adminOnly(call, () => this.exportDataset())
    }
    return undefined
  }

  private login(call: Call) {
    const { username } = call.body as { username: string }
    return jsonResponse(this.issue(username))
  }

  private refresh(call: Call) {
    const token = (call.body as { refresh_token: string }).refresh_token
    const username = this.refreshTokens.get(token)
    if (!username) return problem(401, 'Your session has expired. Please log in again.')
    this.refreshTokens.delete(token)
    return jsonResponse(this.issue(username))
  }

  private listSchools(call: Call) {
    const stage = call.query.get('stage')
    const limit = Number(call.query.get('limit') ?? 50)
    const offset = Number(call.query.get('offset') ?? 0)
    const matches = this.schools
      .filter((s) => !stage || s.stages.includes(stage as never))
      .sort((a, b) => a.school_name.localeCompare(b.school_name))
    return jsonResponse({
      total: matches.length,
      limit,
      offset,
      items: matches.slice(offset, offset + limit),
    })
  }

  private locate(postal: string) {
    const place = postal.length === 6 ? SECTORS[postal.slice(0, 2)] : undefined
    return place
      ? jsonResponse({ postal, ...place })
      : problem(404, 'This postal code could not be located. Please check it and try again.')
  }

  private postReview(call: Call, username: string, schoolId: number) {
    const text = String((call.body as { text: string }).text)
      .replace(/<[^>]*>/g, '')
      .trim()
    if (!text) return problem(422, 'Review text cannot be blank or consist entirely of spaces.')
    if (this.reviews.some((r) => r.school_id === schoolId && r.username === username)) {
      return problem(409, 'You have already reviewed this school.')
    }
    const review = this.addReview({
      school_id: schoolId,
      username,
      text,
      created_at: '2026-10-24T10:00:00+00:00',
    })
    return jsonResponse(review)
  }

  private changeReview(call: Call, username: string, id: number) {
    const review = this.reviews.find((r) => r.id === id)
    if (!review) return problem(404, 'This review could not be found.')
    if (review.username !== username) return problem(403, 'You can only change your own review.')
    if (call.method === 'DELETE') {
      this.reviews = this.reviews.filter((r) => r.id !== id)
      return noContent()
    }
    review.text = (call.body as { text: string }).text.trim()
    review.updated_at = '2026-10-24T11:00:00+00:00'
    return jsonResponse(review)
  }

  private changeBookmark(call: Call, username: string, id: number) {
    const saved = this.bookmarks[username] ?? []
    if (call.method === 'PUT') {
      if (!this.schools.some((s) => s.id === id))
        return problem(404, 'This school could not be found.')
      if (!saved.includes(id)) this.bookmarks[username] = [...saved, id]
    } else {
      this.bookmarks[username] = saved.filter((x) => x !== id)
    }
    return noContent()
  }

  private saveProfile(call: Call, username: string) {
    const profile = call.body as ProfileRow
    if (!/^\d{6}$/.test(profile.postal ?? '')) {
      return problem(422, 'Please enter a valid 6-digit Singapore postal code.')
    }
    this.profiles[username] = profile
    return jsonResponse(profile)
  }

  private details(choices: number[]) {
    return choices.flatMap((id) => this.schools.filter((s) => s.id === id))
  }

  /** The rule plan ranks the stage's schools by distance from the postal code; the AI plan is name order, so the two differ. */
  private generate(call: Call, kind: 'rule' | 'ai') {
    const request = call.body as { stage: string; postal: string | null }
    if (kind === 'ai' && this.ai === 'error') {
      return problem(503, 'Unable to generate AI recommendation at this time. Please try again.')
    }
    if (kind === 'ai' && this.ai === 'hang') {
      return new Promise<Response>((_, reject) => {
        call.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })
    }
    const origin = request.postal ? SECTORS[request.postal.slice(0, 2)] : undefined
    const pool = this.schools.filter((s) => s.stages.includes(request.stage as never))
    const distance = (s: ServerSchool) =>
      origin && s.latitude !== null && s.longitude !== null
        ? Math.hypot(s.latitude - origin.latitude, s.longitude - origin.longitude)
        : 0
    const ordered =
      kind === 'rule'
        ? pool.sort(
            (a, b) => distance(a) - distance(b) || a.school_name.localeCompare(b.school_name),
          )
        : pool.sort((a, b) => a.school_name.localeCompare(b.school_name))
    const choices = ordered.slice(0, 3).map((s) => s.id)
    return jsonResponse({ choices, schools: this.details(choices) })
  }

  private roadmap(call: Call, username: string) {
    const stored = this.roadmaps[username]
    const respond = (row: RoadmapRow) =>
      jsonResponse({ ...row, schools: this.details(row.choices) })
    switch (call.method) {
      case 'GET':
        return stored
          ? respond(stored)
          : problem(404, 'No saved roadmap was found for this account.')
      case 'PUT': {
        const row = call.body as RoadmapRow
        if (row.choices.length < 1 || row.choices.length > 3) {
          return problem(422, 'A roadmap must contain between 1 and 3 school ids.')
        }
        this.roadmaps[username] = row
        return respond(row)
      }
      case 'PATCH': {
        if (!stored) return problem(404, 'No saved roadmap was found for this account.')
        stored.choices = (call.body as { choices: number[] }).choices
        return respond(stored)
      }
      case 'DELETE':
        delete this.roadmaps[username]
        return noContent()
      default:
        return problem(405, 'Method not allowed')
    }
  }

  private exportDataset() {
    if (this.exportOutcome === 'unavailable') {
      return problem(503, 'Export Failed: Unable to retrieve school data at this time.')
    }
    const rows = this.schools.map((s) => `${s.school_key},${s.school_name}`)
    return new Response(['school_key,school_name', ...rows].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${DATASET_EXPORT_FILENAME}"`,
      },
    })
  }

  private updateDataset(call: Call) {
    const files = (call.body as FormData).getAll('files')
    if (files.length === 0) {
      return problem(422, 'Please select a CSV file before updating the database.')
    }
    switch (this.datasetOutcome) {
      case 'parse':
        return problem(
          422,
          'Database Update Failed: Unable to process dataset format. Please check source data and try again.',
        )
      case 'database':
        return problem(
          503,
          'Database Update Failed: Unable to connect to local database. Please try again later.',
        )
      case 'running':
        return problem(409, 'A database update is already running. Please wait for it to finish.')
      case 'success':
        this.datasetRecords += 6
        this.datasetLastUpdate = '2026-10-24T11:00:00+00:00'
        return jsonResponse({
          message: 'Database updated successfully with the latest Singapore school data',
          schools: this.datasetRecords,
          added: 6,
          updated: this.datasetRecords - 6,
        })
    }
  }
}

/** Replaces `fetch` with a fresh fake PathSG server and returns it. */
export function stubApi(): FakeApi {
  const api = new FakeApi()
  vi.stubGlobal('fetch', api.fetch)
  return api
}
