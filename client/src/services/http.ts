/** Generic message for failures the user cannot act on (REQ-4.12). */
export const GENERIC_ERROR = 'Unable to complete your request at this time. Please try again later.'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  /** Bearer access token for authenticated endpoints. */
  token?: string
}

function baseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
}

/** FastAPI reports `detail` as a string for handled errors and as a list for validation errors. */
function extractMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const { detail } = payload as { detail: unknown }
    if (typeof detail === 'string') return detail
  }
  return GENERIC_ERROR
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, GENERIC_ERROR)
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, extractMessage(payload))
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
