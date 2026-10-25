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

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Sent as JSON, or as a multipart form when it is a FormData (file uploads). */
  body?: unknown
  /** Bearer access token for authenticated endpoints. */
  token?: string
  /** Aborting it fails the request with status 0, like an unreachable server. */
  signal?: AbortSignal
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

/** Sends the request. A refusal or an unreachable server becomes an ApiError. */
async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, token, signal } = options
  const headers: Record<string, string> = {}
  const isForm = body instanceof FormData
  // A multipart body needs the browser to add its own content type, with the boundary.
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(0, GENERIC_ERROR)
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, extractMessage(payload))
  }
  return response
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** A file the server sent, with the name it suggested if the response carried one. */
export interface Download {
  blob: Blob
  filename: string | null
}

function suggestedName(response: Response): string | null {
  const match = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '')
  return match?.[1] ?? null
}

/** Like `apiRequest`, for an endpoint that answers with a file instead of JSON. */
export async function apiDownload(path: string, options: RequestOptions = {}): Promise<Download> {
  const response = await send(path, options)
  return { blob: await response.blob(), filename: suggestedName(response) }
}
