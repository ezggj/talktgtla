/** Stable guest id for free AI daily quota (localStorage + cookie mirror). */

const STORAGE_KEY = 'ttl_eat_guest'
const COOKIE = 'ttl_eat_guest'

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 400
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

/** Get or create a durable guest fingerprint for quota. */
export function getOrCreateEatGuestId(): string {
  if (typeof window === 'undefined') return 'guest_ssr'
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY)?.trim()
    const fromCk = readCookie(COOKIE)?.trim()
    const id = fromLs || fromCk || randomId()
    localStorage.setItem(STORAGE_KEY, id)
    if (fromCk !== id) writeCookie(COOKIE, id)
    return id.slice(0, 80)
  } catch {
    return randomId().slice(0, 80)
  }
}
