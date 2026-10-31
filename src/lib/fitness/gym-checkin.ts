/** Local-first voluntary gym check-in (自願報到). */

import { dayKeyFromIso, todayKey } from './storage'

const KEY = 'talktgtla-gym-checkin-v1'

export type GymCheckin = {
  gymId: string
  gymName: string
  area: string
  displayName: string
  at: string
  /** Local day key */
  day: string
}

export function loadGymCheckin(): GymCheckin | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GymCheckin
    if (!parsed?.gymId || !parsed.at) return null
    // Expire after 4 hours or new calendar day
    const age = Date.now() - Date.parse(parsed.at)
    if (Number.isNaN(age) || age > 4 * 3600_000) return null
    if (parsed.day && parsed.day !== todayKey()) return null
    return parsed
  } catch {
    return null
  }
}

export function saveGymCheckin(c: Omit<GymCheckin, 'day' | 'at'> & { at?: string }): GymCheckin {
  const at = c.at || new Date().toISOString()
  const full: GymCheckin = {
    gymId: c.gymId,
    gymName: c.gymName,
    area: c.area,
    displayName: c.displayName,
    at,
    day: dayKeyFromIso(at),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(full))
  } catch {
    /* ignore */
  }
  return full
}

export function clearGymCheckin() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function checkinMinutesLeft(c: GymCheckin): number {
  const end = Date.parse(c.at) + 4 * 3600_000
  return Math.max(0, Math.round((end - Date.now()) / 60000))
}
