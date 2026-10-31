/** Pure client progressive-overload tip from session history. */

import type { WorkoutSession, WorkoutSet } from './storage'

export type OverloadTip = {
  id: string
  text: string
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

function topWorkingSet(sets: WorkoutSet[]): WorkoutSet | null {
  if (!sets.length) return null
  return [...sets].sort((a, b) => b.weightKg * b.reps - a.weightKg * a.reps || b.weightKg - a.weightKg)[0]
}

function fmt(w: number) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '')
}

/**
 * Suggest a calm Cantonese tip when there is enough history.
 * Needs ≥2 finished sessions with the exercise, OR ≥1 finished + ≥2 sets in active.
 */
export function buildOverloadTip(
  exerciseId: string,
  sessions: WorkoutSession[],
  active: WorkoutSession | null
): OverloadTip | null {
  if (!exerciseId) return null
  const hist = finishedWithExercise(
    sessions.filter((s) => !active || s.id !== active.id),
    exerciseId
  )
  const activeSets = active ? setsFor(active, exerciseId) : []
  const enoughHistory = hist.length >= 2
  const enoughActive = hist.length >= 1 && activeSets.length >= 2
  if (!enoughHistory && !enoughActive) return null

  const lastSess = hist[0]
  const lastSets = lastSess ? setsFor(lastSess, exerciseId) : []
  const lastTop = topWorkingSet(lastSets)
  if (!lastTop) return null

  // Check last 3 finished sessions for hitting target reps at same weight
  const recent = hist.slice(0, 3)
  if (recent.length >= 3) {
    const weights = recent.map((s) => {
      const top = topWorkingSet(setsFor(s, exerciseId))
      return top
    })
    if (weights.every(Boolean)) {
      const w0 = weights[0]!
      const sameWeight = weights.every((w) => w!.weightKg === w0.weightKg)
      const target = Math.max(w0.reps, 8)
      const allHit = weights.every((w) => w!.reps >= target)
      if (sameWeight && allHit) {
        const next = Math.round((w0.weightKg + 2.5) * 2) / 2
        return {
          id: `triple-${exerciseId}-${w0.weightKg}`,
          text: `連續三次打齊 ${target} 下（${fmt(w0.weightKg)}kg），今次可以試 +2.5 → ${fmt(next)}kg`,
          suggestedWeightKg: next,
        }
      }
    }
  }

  // Active session: if already logged ≥2 solid sets matching last weight, nudge up
  if (activeSets.length >= 2 && lastTop) {
    const solid = activeSets.filter((s) => s.weightKg >= lastTop.weightKg && s.reps >= lastTop.reps)
    if (solid.length >= 2) {
      const next = Math.round((lastTop.weightKg + 2.5) * 2) / 2
      return {
        id: `active-solid-${exerciseId}-${activeSets.length}`,
        text: `呢兩組都穩陣打到 ${fmt(lastTop.weightKg)}×${lastTop.reps}，下一組試 ${fmt(next)}？`,
        suggestedWeightKg: next,
      }
    }
  }

  // Default: reference last session
  if (lastTop.reps >= 8) {
    const next = Math.round((lastTop.weightKg + 2.5) * 2) / 2
    return {
      id: `last-ok-${exerciseId}-${lastSess.id}`,
      text: `上次 ${fmt(lastTop.weightKg)}×${lastTop.reps}，今次穩陣可以試 ${fmt(next)}`,
      suggestedWeightKg: next,
    }
  }

  if (lastTop.reps <= 5 && lastTop.weightKg > 0) {
    return {
      id: `last-hard-${exerciseId}-${lastSess.id}`,
      text: `上次 ${fmt(lastTop.weightKg)}×${lastTop.reps} 有啲硬——今次可以沿用重量，先打齊 reps`,
      suggestedWeightKg: lastTop.weightKg,
    }
  }

  return {
    id: `last-ref-${exerciseId}-${lastSess.id}`,
    text: `上次 ${fmt(lastTop.weightKg)}×${lastTop.reps}——今次睇手感微調就得`,
    suggestedWeightKg: lastTop.weightKg,
  }
}
