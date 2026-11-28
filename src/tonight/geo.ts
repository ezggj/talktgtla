export const HERE_KEY = 'tonight:here'

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earth = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return ''
  if (meters < 1000) return `${Math.max(1, Math.round(meters))}m`
  const km = meters / 1000
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`
}

/** Rough walk at 80m per minute. Not a live traffic estimate. */
export function walkMinutes(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) return 0
  return Math.max(1, Math.round(meters / 80))
}

export function readHere(): { lat: number; lng: number } | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = JSON.parse(sessionStorage.getItem(HERE_KEY) ?? 'null') as { lat?: unknown; lng?: unknown } | null
    if (!raw || typeof raw.lat !== 'number' || typeof raw.lng !== 'number') return null
    return { lat: raw.lat, lng: raw.lng }
  } catch {
    return null
  }
}

export function writeHere(here: { lat: number; lng: number }) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(HERE_KEY, JSON.stringify(here))
}
