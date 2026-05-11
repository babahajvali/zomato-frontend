// Session storage helpers — token + user details persisted in localStorage.
const KEY = 'zomato_session'
const OWNED_KEY = 'zomato_owned_restaurant_id'
const OWNED_LIST_KEY = 'zomato_owned_restaurant_ids'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
  // Only sync to dev endpoint in development environment
  if (import.meta.env.DEV) {
    try {
      fetch('/__session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      }).catch(() => {})
    } catch {}
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(OWNED_KEY)
  localStorage.removeItem(OWNED_LIST_KEY)
  // Only sync to dev endpoint in development environment
  if (import.meta.env.DEV) {
    try {
      fetch('/__session', { method: 'DELETE' }).catch(() => {})
    } catch {}
  }
}

export function getToken() {
  const s = getSession()
  return s?.token || null
}

export function getUserId() {
  const s = getSession()
  return s?.userId || null
}

export function getRole() {
  const s = getSession()
  return s?.role || 'CUSTOMER'
}
