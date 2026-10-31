/** Local cache + guest mode. Logged-in users sync via lib/fitness/cloud.ts */

export type SetOutcome = 'ok' | 'fail' | 'half'

export type WorkoutSet = {
  id: string
  exerciseId: string
  exerciseName: string
  setIndex: number
  weightKg: number
  reps: number
  restSec?: number
  completedAt: string
  /** Local-first: 失敗組／半組 */
  outcome?: SetOutcome
}

export type WorkoutSession = {
  id: string
  startedAt: string
  endedAt?: string
  note?: string
  sets: WorkoutSet[]
  templateId?: string
  /** Post-workout analysis (local + cloud jsonb) */
  analysis?: import('./analysis').WorkoutAnalysis
}

export type MealMacros = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export type MealEntry = {
  id: string
  createdAt: string
  name: string
  imageDataUrl?: string
  /** Supabase Storage path when synced */
  imagePath?: string
  macros: MealMacros
  portion: number // 1 = 100%
  note?: string
  estimated: boolean
  source?: 'mock' | 'ai' | 'manual'
}

export type FitnessGoals = {
  proteinG: number
  kcal: number
}

const WORKOUTS_KEY = 'talktgtla-workouts-v1'
const MEALS_KEY = 'talktgtla-meals-v1'
const GOALS_KEY = 'talktgtla-goals-v1'
const PRS_KEY = 'talktgtla-prs-v1'
const ACTIVE_KEY = 'talktgtla-active-session-v1'

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function loadSessions(): WorkoutSession[] {
  return readJson<WorkoutSession[]>(WORKOUTS_KEY, [])
}

export function saveSessions(sessions: WorkoutSession[]) {
  writeJson(WORKOUTS_KEY, sessions)
}

export function loadActiveSession(): WorkoutSession | null {
  return readJson<WorkoutSession | null>(ACTIVE_KEY, null)
}

export function saveActiveSession(session: WorkoutSession | null) {
  if (!session) {
    try {
      localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  writeJson(ACTIVE_KEY, session)
}

export function loadMeals(): MealEntry[] {
  return readJson<MealEntry[]>(MEALS_KEY, [])
}

export function saveMeals(meals: MealEntry[]) {
  writeJson(MEALS_KEY, meals)
}

export function loadGoals(): FitnessGoals {
  return readJson<FitnessGoals>(GOALS_KEY, { proteinG: 150, kcal: 2200 })
}

export function saveGoals(goals: FitnessGoals) {
  writeJson(GOALS_KEY, goals)
}

export type PRMap = Record<string, { weightKg: number; reps: number; at: string }>

export function loadPRs(): PRMap {
  return readJson<PRMap>(PRS_KEY, {})
}

export function savePRs(prs: PRMap) {
  writeJson(PRS_KEY, prs)
}

export function newId() {
  return uid()
}

/** Local calendar day YYYY-MM-DD (HK / Asia timezone-friendly; not UTC slice). */
export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Day key of an ISO timestamp in the user's local zone. */
export function dayKeyFromIso(iso: string) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso.slice(0, 10)
  return todayKey(new Date(t))
}

export function isSameDay(iso: string, day = todayKey()) {
  return dayKeyFromIso(iso) === day
}
