import { loadSessions, todayKey, type WorkoutSession } from './storage'

const STREAK_KEY = 'talktgtla-workout-days-v1'

function readDays(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeDays(days: string[]) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify([...new Set(days)].sort()))
  } catch {
    /* ignore */
  }
}

/** Mark today as trained (call on finish session). */
export function markTrainedToday(iso = new Date().toISOString()) {
  const day = iso.slice(0, 10)
  const days = readDays()
  if (!days.includes(day)) {
    days.push(day)
    writeDays(days)
  }
  try {
    localStorage.setItem('talktgtla-trained-today', day)
  } catch {
    /* ignore */
  }
}

export function trainedToday(d = new Date()): boolean {
  const key = todayKey(d)
  try {
    if (localStorage.getItem('talktgtla-trained-today') === key) return true
  } catch {
    /* ignore */
  }
  return loadSessions().some((s) => s.endedAt && s.startedAt.slice(0, 10) === key)
}

/** Sync day set from finished sessions (cloud or local). */
export function syncDaysFromSessions(sessions: WorkoutSession[]) {
  const days = sessions
    .filter((s) => s.endedAt)
    .map((s) => s.startedAt.slice(0, 10))
  const merged = [...new Set([...readDays(), ...days])].sort()
  writeDays(merged)
  const today = todayKey()
  if (merged.includes(today)) {
    try {
      localStorage.setItem('talktgtla-trained-today', today)
    } catch {
      /* ignore */
    }
  }
}

/** Consecutive calendar days ending today or yesterday (still alive). */
export function computeStreak(sessions?: WorkoutSession[]): number {
  if (sessions) syncDaysFromSessions(sessions)
  const set = new Set(readDays())
  // also merge sessions if provided already done
  let cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  const today = todayKey(cursor)
  const y = new Date(cursor)
  y.setDate(y.getDate() - 1)
  const yesterday = todayKey(y)

  if (!set.has(today) && !set.has(yesterday)) return 0

  // If missed today, start from yesterday
  if (!set.has(today)) {
    cursor = y
  }

  let streak = 0
  for (;;) {
    const k = todayKey(cursor)
    if (!set.has(k)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
