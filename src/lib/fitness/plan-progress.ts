/** Match finished workouts this week against a generated plan's days. */

import type { GeneratedPlan, PlanDay } from './plan-generator'
import { startOfWeekMonday, addDays } from './cloud'
import { dayKeyFromIso, todayKey as localTodayKey, type WorkoutSession } from './storage'

export type PlanDayProgress = {
  day: PlanDay
  /** Session that best matches this plan day this week (if any) */
  matchedSession: WorkoutSession | null
  /** 0–1 overlap of planned exercise ids logged in matched session */
  coverage: number
  done: boolean
  /** ISO date (Mon-based week) for this plan slot */
  slotDate: string
  isToday: boolean
}

function exerciseOverlap(session: WorkoutSession, day: PlanDay): number {
  const planned = new Set(day.exercises.map((e) => e.exerciseId))
  if (planned.size === 0) return 0
  const logged = new Set(session.sets.map((s) => s.exerciseId))
  let hit = 0
  for (const id of planned) if (logged.has(id)) hit++
  return hit / planned.size
}

/** Best session for a plan day: highest coverage among sessions on that calendar day, else any this week. */
export function computePlanWeekProgress(
  plan: GeneratedPlan,
  sessions: WorkoutSession[],
  now = new Date()
): {
  days: PlanDayProgress[]
  doneCount: number
  total: number
  nextIncomplete: PlanDayProgress | null
} {
  const weekStart = startOfWeekMonday(now)
  const weekEnd = addDays(weekStart, 7)
  const finished = sessions.filter((s) => {
    if (!s.endedAt) return false
    const t = new Date(s.startedAt).getTime()
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  })

  const todayStr = localTodayKey(now)

  const days: PlanDayProgress[] = plan.days.map((day) => {
    const slot = addDays(weekStart, day.dayIndex)
    const slotDate = localTodayKey(slot)
    // Prefer sessions on the same weekday slot; else any this week
    const sameDay = finished.filter((s) => dayKeyFromIso(s.startedAt) === slotDate)
    const pool = sameDay.length ? sameDay : finished
    let best: WorkoutSession | null = null
    let bestCov = 0
    for (const s of pool) {
      const cov = exerciseOverlap(s, day)
      if (cov > bestCov) {
        bestCov = cov
        best = s
      }
    }
    // Also check templateId plan: match
    if (bestCov < 0.35) {
      for (const s of finished) {
        if (s.templateId?.startsWith('plan:') && exerciseOverlap(s, day) > bestCov) {
          best = s
          bestCov = exerciseOverlap(s, day)
        }
      }
    }
    const done = bestCov >= 0.45
    return {
      day,
      matchedSession: done ? best : bestCov >= 0.25 ? best : null,
      coverage: bestCov,
      done,
      slotDate,
      isToday: slotDate === todayStr,
    }
  })

  const doneCount = days.filter((d) => d.done).length
  const nextIncomplete =
    days.find((d) => d.isToday && !d.done) || days.find((d) => !d.done) || null

  return { days, doneCount, total: days.length, nextIncomplete }
}

export function volumeByDay(
  sessions: WorkoutSession[],
  daysBack = 14
): { key: string; label: string; volume: number }[] {
  const out: { key: string; label: string; volume: number }[] = []
  const labels = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = localTodayKey(d)
    const volume = sessions
      .filter((s) => s.endedAt && dayKeyFromIso(s.startedAt) === key)
      .reduce((a, s) => a + s.sets.reduce((b, x) => b + x.weightKg * x.reps, 0), 0)
    out.push({ key, label: labels[d.getDay()], volume })
  }
  return out
}
