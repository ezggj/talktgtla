/** Last logged kg × reps for an exercise. Local sessions only — no network. */

import type { WorkoutSession, WorkoutSet } from './storage'
import { isWorkingSet } from './storage'

export type PrefillSource = 'active' | 'history'

export type ExercisePrefill = {
  set: WorkoutSet
  source: PrefillSource
}

function isLaterSet(a: WorkoutSet, b: WorkoutSet) {
  const time = (a.completedAt || '').localeCompare(b.completedAt || '')
  return time > 0 || (time === 0 && a.setIndex >= b.setIndex)
}

/** Latest set of this exercise — prefer working（非熱身）; fallback to warmup-only. */
export function lastSetInSession(session: WorkoutSession, exerciseId: string): WorkoutSet | null {
  let bestWorking: WorkoutSet | null = null
  let bestAny: WorkoutSet | null = null
  for (const set of session.sets) {
    if (set.exerciseId !== exerciseId) continue
    if (!bestAny || isLaterSet(set, bestAny)) bestAny = set
    if (isWorkingSet(set) && (!bestWorking || isLaterSet(set, bestWorking))) bestWorking = set
  }
  return bestWorking || bestAny
}

/**
 * Weight/reps to show when opening a set.
 * Mid-session: last set of this exercise in the active workout.
 * Otherwise: last set from the most recently finished session that includes it.
 * No history → null (leave the inputs empty).
 */
export function prefillSetForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
  active?: WorkoutSession | null
): ExercisePrefill | null {
  if (!exerciseId) return null

  if (active && !active.endedAt) {
    const current = lastSetInSession(active, exerciseId)
    if (current) return { set: current, source: 'active' }
  }

  const history = sessions
    .filter((s) => s.endedAt && (!active || s.id !== active.id))
    .filter((s) => s.sets.some((set) => set.exerciseId === exerciseId))
    .sort(
      (a, b) => Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt)
    )

  const latest = history[0]
  if (!latest) return null
  const set = lastSetInSession(latest, exerciseId)
  if (!set) return null
  return { set, source: 'history' }
}
