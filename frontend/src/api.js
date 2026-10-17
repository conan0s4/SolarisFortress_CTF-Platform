// Tiny fetch helper that:
// - prefixes /api
// - sends session cookies + CSRF token
// - attaches the token-based Authorization header if logged in
// - normalizes errors

const envBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const API_BASE = envBase ? (envBase.endsWith('/api') ? envBase : `${envBase}/api`) : '/api'

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : ''
}

function readToken() {
  try {
    return localStorage.getItem('sf_token') || ''
  } catch {
    return ''
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem('sf_token', token)
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem('sf_token')
  } catch {}
}

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    signal,
  }

  const token = readToken()
  if (token) opts.headers['Authorization'] = `Token ${token}`

  const csrftoken = getCookie('csrftoken')
  if (csrftoken && method !== 'GET') {
    opts.headers['X-CSRFToken'] = csrftoken
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body
      // let the browser set the multipart boundary
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }

  const res = await fetch(API_BASE + path, opts)

  let data = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try { data = await res.json() } catch { data = null }
  } else {
    try { data = await res.text() } catch { data = null }
  }

  if (!res.ok) {
    let message = ''
    if (data && typeof data === 'object') {
      if (data.detail) {
        message = data.detail
      } else if (data.error) {
        message = data.error
      } else {
        const entries = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .filter(Boolean)
        if (entries.length > 0) message = entries.join(' | ')
      }
    } else if (typeof data === 'string') {
      message = data
    }
    if (!message) {
      message = `Request failed (${res.status})`
    }
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}