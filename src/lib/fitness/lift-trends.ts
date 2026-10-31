/** Recent-session trends for the main lifts. Local sessions only — no network. */

import type { WorkoutSession, WorkoutSet } from './storage'

export type LiftMetric = 'weight' | 'volume'

export type MainLift = {
  id: string
  /** Short label people actually say */
  label: string
}

/** Catalog ids: squat, bench, deadlift, rdl, ohp, row. */
export const MAIN_LIFTS: MainLift[] = [
  { id: 'squat', label: '深蹲' },
  { id: 'bench', label: '卧推' },
  { id: 'deadlift', label: '硬拉' },
  { id: 'rdl', label: 'RDL' },
  { id: 'ohp', label: '肩推' },
  { id: 'row', label: '划船' },
]

export type LiftPoint = {
  at: string
  dateLabel: string
  weightKg: number
  reps: number
  /** Sum of kg × reps for this lift in that session */
  volume: number
}

export type LiftTrend = {
  id: string
  label: string
  points: LiftPoint[]
}

const MAX_POINTS = 10

function workingSets(sets: WorkoutSet[], exerciseId: string): WorkoutSet[] {
  const mine = sets.filter((s) => s.exerciseId === exerciseId && s.weightKg > 0 && s.reps > 0)
  const ok = mine.filter((s) => s.outcome !== 'fail')
  return ok.length ? ok : mine
}

function bestSet(sets: WorkoutSet[]): WorkoutSet | null {
  let best: WorkoutSet | null = null
  for (const s of sets) {
    if (!best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps)) {
      best = s
    }
  }
  return best
}

function dateLabel(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Finished sessions, oldest → newest, last N times each lift showed up. */
export function buildLiftTrends(sessions: WorkoutSession[], limit = MAX_POINTS): LiftTrend[] {
  const finished = sessions
    .filter((s) => Boolean(s.endedAt) && Array.isArray(s.sets) && s.sets.length > 0)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))

  return MAIN_LIFTS.map((lift) => {
    const points: LiftPoint[] = []
    for (const sess of finished) {
      const sets = workingSets(sess.sets, lift.id)
      const best = bestSet(sets)
      if (!best) continue
      const volume = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)
      points.push({
        at: sess.startedAt,
        dateLabel: dateLabel(sess.startedAt),
        weightKg: best.weightKg,
        reps: best.reps,
        volume,
      })
    }
    return { id: lift.id, label: lift.label, points: points.slice(-limit) }
  })
}

export function formatKg(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function formatTopSet(p: LiftPoint): string {
  return `${formatKg(p.weightKg)} kg × ${p.reps}`
}

export function formatVolume(n: number): string {
  return Math.round(n).toLocaleString('zh-HK')
}

export function pointValue(p: LiftPoint, metric: LiftMetric): number {
  return metric === 'weight' ? p.weightKg : p.volume
}

/** Spoken delta vs the previous session that included this lift. */
export function deltaLabel(points: LiftPoint[], metric: LiftMetric): string | null {
  if (points.length < 2) return null
  const prev = points[points.length - 2]
  const last = points[points.length - 1]
  const d = pointValue(last, metric) - pointValue(prev, metric)
  const rounded = Math.round(d * 10) / 10
  if (rounded === 0) return '同上一場一樣'
  const n = metric === 'weight' ? `${formatKg(Math.abs(rounded))} kg` : formatVolume(Math.abs(rounded))
  if (metric === 'weight') return rounded > 0 ? `重咗 ${n}` : `輕咗 ${n}`
  return rounded > 0 ? `容量多咗 ${n}` : `容量少咗 ${n}`
}
