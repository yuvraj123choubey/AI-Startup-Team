// Small fetch wrapper for the backend. It turns every failure into an ApiError with a
// code the UI can explain: server_unavailable, timeout, missing_api_key, invalid_response, …
// Only VITE_API_URL is read here; API keys never exist in frontend code.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(code, message, { status = 0, fatal = false } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.fatal = fatal
  }
}

export const BACKEND_LABEL = BASE || 'http://localhost:3001 (via the Vite proxy)'

// A backend on another machine (e.g. Render's free tier) may need up to a minute to wake up.
const REMOTE = Boolean(BASE) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)
export const REMOTE_BACKEND = REMOTE

// Founder access code for a protected backend. Kept only in this browser and sent as a header.
const ACCESS_KEY = 'ai-startup-team.accessCode'
export function getAccessCode() {
  try {
    return localStorage.getItem(ACCESS_KEY) || ''
  } catch {
    return ''
  }
}
export function setAccessCode(code) {
  try {
    if (code) localStorage.setItem(ACCESS_KEY, code)
    else localStorage.removeItem(ACCESS_KEY)
  } catch {
    // storage unavailable: the code only lasts for this page view
  }
}

// Preview links from a hosted backend may be relative to the backend.
export function resolveBackendUrl(url) {
  return url && url.startsWith('/') ? BASE + url : url
}

// The GitHub Pages build is static: there is no backend to call, so requests fail fast with a clear message.
export const STATIC_SITE = import.meta.env.VITE_STATIC_SITE === 'true' && !BASE

export async function apiRequest(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  if (STATIC_SITE) {
    throw new ApiError('static_site', 'This is the GitHub Pages demo, which has no backend. Build Project and Live AI work when you run the project locally with “npm run dev:all”.', { fatal: true })
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    const code = getAccessCode()
    res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(code ? { 'X-Access-Code': code } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('timeout', `The backend did not answer within ${Math.round(timeoutMs / 1000)} seconds.`)
    }
    throw new ApiError('server_unavailable', `Cannot reach the backend at ${BACKEND_LABEL}. Start it with “npm run server”.`, { fatal: true })
  } finally {
    clearTimeout(timer)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    // The Vite proxy answers 5xx without JSON when the backend is not running.
    if (!data && res.status >= 500) {
      throw new ApiError('server_unavailable', `Cannot reach the backend at ${BACKEND_LABEL}. Start it with “npm run server”.`, { status: res.status, fatal: true })
    }
    const err = data?.error
    throw new ApiError(err?.code || 'request_failed', err?.message || `The request failed (HTTP ${res.status}).`, { status: res.status, fatal: Boolean(err?.fatal) })
  }
  if (!data) throw new ApiError('invalid_response', 'The backend returned a response that is not JSON.', { status: res.status })
  return data
}

export function getHealth() {
  return apiRequest('/api/health', { timeoutMs: REMOTE ? 75000 : 4000 })
}
