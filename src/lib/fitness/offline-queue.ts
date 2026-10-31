/** Offline / failed-cloud sync queue — stores ids; payload lives in localStorage lists. */

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadMeals, loadSessions } from './storage'
import { persistFinishedWorkout, upsertMeal } from './cloud'

const QUEUE_KEY = 'talktgtla-offline-queue-v1'

export type OfflineJob =
  | { id: string; kind: 'workout'; sessionId: string; enqueuedAt: string }
  | { id: string; kind: 'meal'; mealId: string; enqueuedAt: string }

function readQueue(): OfflineJob[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OfflineJob[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: OfflineJob[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 80)))
  } catch {
    /* ignore quota */
  }
}

export function isProbablyOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function peekOfflineQueue() {
  return readQueue()
}

export function offlineQueueCount() {
  return readQueue().length
}

export function removeOfflineJob(id: string) {
  writeQueue(readQueue().filter((j) => j.id !== id))
}

export function enqueueOffline(
  input: { kind: 'workout'; sessionId: string } | { kind: 'meal'; mealId: string }
) {
  const q = readQueue()
  if (input.kind === 'workout') {
    const next = q.filter((j) => !(j.kind === 'workout' && j.sessionId === input.sessionId))
    next.push({
      id: `w-${input.sessionId}`,
      kind: 'workout',
      sessionId: input.sessionId,
      enqueuedAt: new Date().toISOString(),
    })
    writeQueue(next)
    return
  }
  const next = q.filter((j) => !(j.kind === 'meal' && j.mealId === input.mealId))
  next.push({
    id: `m-${input.mealId}`,
    kind: 'meal',
    mealId: input.mealId,
    enqueuedAt: new Date().toISOString(),
  })
  writeQueue(next)
}

export function enqueueWorkout(session: { id: string }) {
  enqueueOffline({ kind: 'workout', sessionId: session.id })
}

export function enqueueMeal(meal: { id: string }) {
  enqueueOffline({ kind: 'meal', mealId: meal.id })
}

/** Flush queued workouts + meals from local lists to cloud. */
export async function flushOfflineQueue(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: number; left: number; note: string | null }> {
  const q = readQueue()
  if (q.length === 0) return { ok: 0, left: 0, note: null }
  if (isProbablyOffline()) {
    return { ok: 0, left: q.length, note: `暫時冇網，${q.length} 項留喺呢部機，有網會再同步` }
  }

  const sessions = loadSessions()
  const meals = loadMeals()
  const remaining: OfflineJob[] = []
  let ok = 0

  for (const job of q) {
    try {
      if (job.kind === 'workout') {
        const sess = sessions.find((s) => s.id === job.sessionId)
        if (!sess?.endedAt) continue
        await persistFinishedWorkout(supabase, userId, sess)
        ok++
      } else {
        const meal = meals.find((m) => m.id === job.mealId)
        if (!meal) continue
        await upsertMeal(supabase, userId, meal, null)
        ok++
      }
    } catch {
      remaining.push(job)
    }
  }
  writeQueue(remaining)
  const note =
    ok > 0
      ? remaining.length
        ? `已同步 ${ok} 項，仲有 ${remaining.length} 項等返`
        : `冇網嗰陣留低嘅 ${ok} 項已同步去你個帳戶`
      : remaining.length
        ? `仲有 ${remaining.length} 項暫存 · 稍後再試`
        : null
  return { ok, left: remaining.length, note }
}
