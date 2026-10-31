import { dayKeyFromIso, loadSessions, todayKey, type WorkoutSession } from './storage'

const STREAK_KEY = 'talktgtla-workout-days-v1'
const REPAIR_KEY = 'talktgtla-streak-repair-v1'

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

type RepairState = {
  month: string
  remaining: number
  repairedDays: string[]
}

function monthKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function readRepair(): RepairState {
  const mk = monthKey()
  if (typeof window === 'undefined') {
    return { month: mk, remaining: 1, repairedDays: [] }
  }
  try {
    const raw = localStorage.getItem(REPAIR_KEY)
    if (!raw) return { month: mk, remaining: 1, repairedDays: [] }
    const parsed = JSON.parse(raw) as Partial<RepairState>
    const repairedDays = Array.isArray(parsed.repairedDays) ? parsed.repairedDays : []
    if (parsed.month !== mk) {
      return { month: mk, remaining: 1, repairedDays }
    }
    return {
      month: mk,
      remaining: parsed.remaining === 0 ? 0 : 1,
      repairedDays,
    }
  } catch {
    return { month: mk, remaining: 1, repairedDays: [] }
  }
}

function writeRepair(state: RepairState) {
  try {
    localStorage.setItem(REPAIR_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function markTrainedToday(iso = new Date().toISOString()) {
  const day = dayKeyFromIso(iso)
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
  return loadSessions().some((s) => s.endedAt && dayKeyFromIso(s.startedAt) === key)
}

export function syncDaysFromSessions(sessions: WorkoutSession[]) {
  const days = sessions
    .filter((s) => s.endedAt)
    .map((s) => dayKeyFromIso(s.startedAt))
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

function trainedSet(): Set<string> {
  const repair = readRepair()
  return new Set([...readDays(), ...repair.repairedDays])
}

export function computeStreak(sessions?: WorkoutSession[]): number {
  if (sessions) syncDaysFromSessions(sessions)
  const set = trainedSet()
  let cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  const today = todayKey(cursor)
  const y = new Date(cursor)
  y.setDate(y.getDate() - 1)
  const yesterday = todayKey(y)

  if (!set.has(today) && !set.has(yesterday)) return 0
  if (!set.has(today)) cursor = y

  let streak = 0
  for (;;) {
    const k = todayKey(cursor)
    if (!set.has(k)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type WeekDay = {
  key: string
  label: string
  trained: boolean
  isToday: boolean
  repaired?: boolean
}

export function weekConsistency(sessions?: WorkoutSession[]): {
  days: WeekDay[]
  trainedCount: number
  streak: number
} {
  if (sessions) syncDaysFromSessions(sessions)
  const repair = readRepair()
  const repaired = new Set(repair.repairedDays)
  const set = trainedSet()
  const labels = ['日', '一', '二', '三', '四', '五', '六']
  const days: WeekDay[] = []
  const today = todayKey()
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    days.push({
      key,
      label: labels[d.getDay()],
      trained: set.has(key),
      isToday: key === today,
      repaired: repaired.has(key),
    })
  }
  return {
    days,
    trainedCount: days.filter((d) => d.trained).length,
    streak: computeStreak(),
  }
}

export type StreakRepairInfo = {
  remaining: number
  gapDay: string | null
  gapLabel: string | null
  streakAfter: number
}

export function getStreakRepairInfo(sessions?: WorkoutSession[]): StreakRepairInfo {
  if (sessions) syncDaysFromSessions(sessions)
  const repair = readRepair()
  const set = trainedSet()
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  const before = new Date(today)
  before.setDate(before.getDate() - 2)
  const todayK = todayKey(today)
  const yesterdayK = todayKey(y)
  const beforeK = todayKey(before)

  const gapIsYesterday =
    !set.has(yesterdayK) && set.has(beforeK) && repair.remaining > 0

  if (!gapIsYesterday) {
    return {
      remaining: repair.remaining,
      gapDay: null,
      gapLabel: null,
      streakAfter: computeStreak(),
    }
  }

  const preview = new Set(set)
  preview.add(yesterdayK)
  let cursor = new Date(today)
  if (!preview.has(todayK)) cursor = y
  let streakAfter = 0
  for (;;) {
    const k = todayKey(cursor)
    if (!preview.has(k)) break
    streakAfter++
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    remaining: repair.remaining,
    gapDay: yesterdayK,
    gapLabel: '昨日',
    streakAfter,
  }
}

export function applyStreakRepair(gapDay?: string): { ok: boolean; message: string } {
  const info = getStreakRepairInfo()
  const day = gapDay || info.gapDay
  if (!day) {
    return { ok: false, message: '而家唔使修復——連練仲喺度，或者冇得接返。' }
  }
  const repair = readRepair()
  if (repair.remaining <= 0) {
    return { ok: false, message: '呢個月修復日用晒喇——下個月先有新嘅。' }
  }
  if (repair.repairedDays.includes(day) || readDays().includes(day)) {
    return { ok: false, message: '呢日已經計咗練過。' }
  }
  writeRepair({
    month: repair.month,
    remaining: 0,
    repairedDays: [...repair.repairedDays, day],
  })
  return {
    ok: true,
    message: `已用修復日豁免 ${info.gapLabel || day}——連練接返 ${info.streakAfter} 日。`,
  }
}

export function streakRepairRemaining(): number {
  return readRepair().remaining
}
