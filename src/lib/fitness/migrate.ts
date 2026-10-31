/** Idempotent local → cloud migration for workouts + meals after login. */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadMeals,
  loadSessions,
  loadGoals,
  saveMeals,
  saveSessions,
  type MealEntry,
  type WorkoutSession,
} from './storage'
import {
  fetchMeals,
  fetchWorkouts,
  migrateLocalMeals,
  migrateLocalWorkouts,
  upsertGoals,
} from './cloud'
import { syncDaysFromSessions } from './streaks'

const FLAG_KEY = 'talktgtla-migrated-v1'

type MigrateFlag = {
  userId: string
  at: string
  workouts: number
  meals: number
}

function readFlag(): MigrateFlag | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FLAG_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MigrateFlag
  } catch {
    return null
  }
}

function writeFlag(flag: MigrateFlag) {
  try {
    localStorage.setItem(FLAG_KEY, JSON.stringify(flag))
  } catch {
    /* ignore */
  }
}

export type MigrateResult = {
  workoutsUploaded: number
  mealsUploaded: number
  workouts: WorkoutSession[]
  meals: MealEntry[]
  alreadyDone: boolean
  note: string
}

/**
 * Upload any local finished workouts / meals missing remotely, then pull cloud as source of truth.
 * Safe to call on every login — skips ids already on cloud; flag only skips the "empty local" no-op path briefly.
 */
export async function migrateLocalFitnessToCloud(
  supabase: SupabaseClient,
  userId: string,
  opts?: { force?: boolean }
): Promise<MigrateResult> {
  const localSessions = loadSessions()
  const localMeals = loadMeals()
  const pendingWorkouts = localSessions.filter((s) => s.endedAt).length
  const pendingMeals = localMeals.length

  const flag = readFlag()
  // If we just migrated for this user and local has nothing new-looking, still pull remote
  const alreadyDone =
    !opts?.force &&
    flag?.userId === userId &&
    pendingWorkouts === 0 &&
    pendingMeals === 0

  let workoutsUploaded = 0
  let mealsUploaded = 0

  if (!alreadyDone) {
    workoutsUploaded = await migrateLocalWorkouts(supabase, userId, localSessions)
    mealsUploaded = await migrateLocalMeals(supabase, userId, localMeals)
    try {
      await upsertGoals(supabase, userId, loadGoals())
    } catch {
      /* goals optional */
    }
  }

  const workouts = await fetchWorkouts(supabase, 120)
  const meals = await fetchMeals(supabase, { limit: 800 })
  saveSessions(workouts)
  saveMeals(meals)
  syncDaysFromSessions(workouts)

  writeFlag({
    userId,
    at: new Date().toISOString(),
    workouts: workoutsUploaded,
    meals: mealsUploaded,
  })

  const note =
    workoutsUploaded > 0 || mealsUploaded > 0
      ? `已將呢部機 ${workoutsUploaded} 次訓練、${mealsUploaded} 餐同步去你個帳戶。`
      : '你個帳戶嘅紀錄已載入。之後新記嘅都會同步過去。'

  return {
    workoutsUploaded,
    mealsUploaded,
    workouts,
    meals,
    alreadyDone: Boolean(alreadyDone),
    note,
  }
}
