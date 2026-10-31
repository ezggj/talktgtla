/**
 * Older progressive-overload blurb.
 * In-flow tips (開波 / 記組 / 完場) live in train-tips.ts and stay rules-only.
 */

import { lastSetInSession, prefillSetForExercise } from './last-set'
import type { WorkoutSession, WorkoutSet } from './storage'

export type OverloadTip = {
  id: string
  text: string
  /** Same baseline as the train-page prefill: that weight, or that weight + 2.5. */
  suggestedWeightKg?: number
}

function finishedWithExercise(sessions: WorkoutSession[], exerciseId: string): WorkoutSession[] {
  return sessions
    .filter((s) => s.endedAt && s.sets.some((x) => x.exerciseId === exerciseId))
    .sort((a, b) => Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt))
}

function setsFor(session: WorkoutSession, exerciseId: string): WorkoutSet[] {
  return session.sets.filter((s) => s.exerciseId === exerciseId)
}

function fmt(w: number) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '')
}

function bump(weightKg: number) {
  return Math.round((weightKg + 2.5) * 2) / 2
}

/**
 * Suggest a calm Cantonese tip when there is enough history.
 * Needs ≥2 finished sessions with the exercise, OR ≥1 finished + ≥2 sets in active.
 * The suggested kg is always the prefill weight, or prefill + 2.5 — never a different set.
 */
export function buildOverloadTip(
  exerciseId: string,
  sessions: WorkoutSession[],
  active: WorkoutSession | null
): OverloadTip | null {
  if (!exerciseId) return null
  const anchor = prefillSetForExercise(sessions, exerciseId, active)
  if (!anchor) return null

  const hist = finishedWithExercise(
    sessions.filter((s) => !active || s.id !== active.id),
    exerciseId
  )
  const activeSets = active ? setsFor(active, exerciseId) : []
  const enoughHistory = hist.length >= 2
  const enoughActive = hist.length >= 1 && activeSets.length >= 2
  if (!enoughHistory && !enoughActive) return null

  const { weightKg, reps } = anchor.set
  const when = anchor.source === 'active' ? '上一組' : '上次'

  const recent = hist.slice(0, 3)
  if (recent.length >= 3) {
    const lasts = recent.map((s) => lastSetInSession(s, exerciseId))
    if (lasts.every(Boolean)) {
      const w0 = lasts[0]!
      const sameWeight = lasts.every((w) => w!.weightKg === w0.weightKg)
      const target = Math.max(w0.reps, 8)
      const allHit = lasts.every((w) => w!.reps >= target)
      if (sameWeight && allHit && weightKg === w0.weightKg) {
        const next = bump(weightKg)
        return {
          id: `triple-${exerciseId}-${weightKg}`,
          text: `連續三次打齊 ${target} 下（${fmt(weightKg)}kg），今次可以試 +2.5 → ${fmt(next)}kg`,
          suggestedWeightKg: next,
        }
      }
    }
  }

  if (anchor.source === 'active' && activeSets.length >= 2) {
    const prev = hist[0] ? lastSetInSession(hist[0], exerciseId) : null
    if (prev && weightKg >= prev.weightKg) {
      const solid = activeSets.filter((s) => s.weightKg >= prev.weightKg && s.reps >= prev.reps)
      if (solid.length >= 2) {
        const next = bump(weightKg)
        return {
          id: `active-solid-${exerciseId}-${activeSets.length}`,
          text: `呢兩組都穩陣打到 ${fmt(weightKg)}×${reps}，下一組試 ${fmt(next)}？`,
          suggestedWeightKg: next,
        }
      }
    }
  }

  if (reps >= 8) {
    const next = bump(weightKg)
    return {
      id: `last-ok-${exerciseId}-${anchor.source}-${weightKg}`,
      text: `${when} ${fmt(weightKg)}×${reps}，今次穩陣可以試 ${fmt(next)}`,
      suggestedWeightKg: next,
    }
  }

  if (reps <= 5 && weightKg > 0) {
    return {
      id: `last-hard-${exerciseId}-${anchor.source}-${weightKg}`,
      text: `${when} ${fmt(weightKg)}×${reps} 有啲硬——今次可以沿用重量，先打齊 reps`,
      suggestedWeightKg: weightKg,
    }
  }

  return {
    id: `last-ref-${exerciseId}-${anchor.source}-${weightKg}`,
    text: `${when} ${fmt(weightKg)}×${reps}——今次睇手感微調就得`,
    suggestedWeightKg: weightKg,
  }
}
