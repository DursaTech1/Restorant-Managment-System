/**
 * Default: same-origin `/api/...` (Vite proxies to Django in dev).
 * Production on another host: set `VITE_API_ORIGIN` (e.g. http://127.0.0.1:8000) — requests go to `${origin}/api/...`.
 */
const origin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '')

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${p}` : p
}

export function formatApiError(data) {
  if (!data) return 'Request failed'
  if (typeof data === 'string') return data
  if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
  const parts = []
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`)
    else if (typeof v === 'object') parts.push(`${k}: ${JSON.stringify(v)}`)
    else parts.push(`${k}: ${v}`)
  }
  return parts.join(' — ') || JSON.stringify(data)
}

async function request(path, options = {}) {
  const url = apiUrl(path)
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }
  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }
  const { body: _b, ...rest } = options
  const res = await fetch(url, { ...rest, headers, body })
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const err = new Error(formatApiError(data))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  getMenu: (availableOnly) =>
    request(availableOnly ? '/api/menu/?available_only=1' : '/api/menu/'),
  getTables: () => request('/api/tables/'),
  getTableAvailability: (id, query) => {
    const q = new URLSearchParams(query).toString()
    return request(`/api/tables/${id}/availability/?${q}`)
  },
  placeOrder: (body) => request('/api/orders/place/', { method: 'POST', body }),
  getOrders: () => request('/api/orders/'),
  getOrder: (id) => request(`/api/orders/${id}/`),
  patchOrderStatus: (id, status) =>
    request(`/api/orders/${id}/status/`, { method: 'PATCH', body: { status } }),
  getReservations: () => request('/api/reservations/'),
  createReservation: (body) => request('/api/reservations/', { method: 'POST', body }),
  patchReservation: (id, body) => request(`/api/reservations/${id}/`, { method: 'PATCH', body }),
}
