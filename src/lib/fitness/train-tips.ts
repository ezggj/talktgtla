/**
 * In-flow training tips from workout history already on the device.
 * Rules only — this module never calls a model.
 */

import { exerciseById } from '../exercises/library'
import { hkDayKey, previousHkDay } from './hk-day'
import { lastSetInSession } from './last-set'
import type { WorkoutSession, WorkoutSet } from './storage'

export type TrainTip = {
  id: string
  /** One or two short spoken lines. */
  lines: string[]
  suggestedWeightKg?: number
  source: 'rules'
}

const LEG_MUSCLES = new Set(['腿', '臀', '臀腿', '小腿'])
const PUSH_MUSCLES = new Set(['胸', '肩'])
const PULL_MUSCLES = new Set(['背'])

export function shortExerciseName(nameZh: string, nameEn: string): string {
  const en = nameEn.trim()
  if (/^[A-Z0-9]{2,6}$/.test(en)) return en
  return nameZh
}

function roundHalf(n: number) {
  return Math.round(n * 2) / 2
}

function fmtKg(n: number) {
  const r = roundHalf(n)
  if (Number.isInteger(r)) return String(r)
  return r.toFixed(1).replace(/\.0$/, '')
}

function feltHeavy(set: WorkoutSet) {
  if (set.outcome === 'fail' || set.outcome === 'half') return true
  return set.weightKg > 0 && set.reps > 0 && set.reps <= 5
}

function finishedSessions(sessions: WorkoutSession[], activeId?: string | null) {
  return sessions
    .filter((s) => s.endedAt && s.id !== activeId && s.sets.length > 0)
    .sort(
      (a, b) =>
        Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt)
    )
}

/**
 * Same set the logger prefills: the latest log of this exercise in each finished session.
 * Not the heaviest set, so 「接受」 changes the number already in the weight field.
 */
export function recentAnchors(
  sessions: WorkoutSession[],
  exerciseId: string,
  activeId?: string | null,
  limit = 3
): WorkoutSet[] {
  const out: WorkoutSet[] = []
  for (const session of finishedSessions(sessions, activeId)) {
    const anchor = lastSetInSession(session, exerciseId)
    if (!anchor) continue
    out.push(anchor)
    if (out.length >= limit) break
  }
  return out
}

function volumeOf(sets: WorkoutSet[]) {
  return sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)
}

/** Before the first set of an exercise in this session. Null when there is no history. */
export function buildOpenTip(opts: {
  exerciseId: string
  name: string
  sessions: WorkoutSession[]
  activeId?: string | null
}): TrainTip | null {
  const recent = recentAnchors(opts.sessions, opts.exerciseId, opts.activeId, 3)
  if (!recent.length) return null
  const last = recent[0]
  const name = opts.name.trim() || '呢個動作'
  const lines: string[] = []
  let suggested: number | undefined

  if (last.weightKg <= 0) {
    lines.push(`上次${name} ${last.reps} 下，今日試多 1 下`)
  } else if (feltHeavy(last)) {
    const next = roundHalf(last.weightKg - 2.5)
    if (next >= 2.5 && next < last.weightKg) {
      lines.push(`${name} 上次感覺重，今日可以減 2.5kg`)
      suggested = next
    } else {
      lines.push(`${name} 上次感覺重，今日可以輕少少`)
      suggested = Math.max(0, next)
    }
  } else if (last.reps >= 8) {
    const next = roundHalf(last.weightKg + 2.5)
    lines.push(`上次${name} ${fmtKg(last.weightKg)}kg × ${last.reps}，今日試 ${fmtKg(next)}kg`)
    suggested = next
  } else {
    lines.push(`上次${name} ${fmtKg(last.weightKg)}kg × ${last.reps}，今日保持重量`)
    suggested = roundHalf(last.weightKg)
  }

  const heavyCount = recent.filter((set) => feltHeavy(set)).length
  if (recent.length >= 2 && feltHeavy(last) && heavyCount >= 2) {
    lines.push('近幾次都偏重，唔使追數字')
  } else if (
    recent.length >= 3 &&
    !feltHeavy(last) &&
    last.reps >= 8 &&
    recent.every(
      (set) => !feltHeavy(set) && set.reps >= 8 && Math.abs(set.weightKg - last.weightKg) < 0.01
    )
  ) {
    lines.push('近三次都打齊，可以試加')
  }

  return {
    id: `open:${opts.exerciseId}:${fmtKg(last.weightKg)}:${last.reps}`,
    lines: lines.slice(0, 2),
    suggestedWeightKg: suggested,
    source: 'rules',
  }
}

/** Right after a set is logged. One short line plus an optional next weight. */
export function buildBetweenSetTip(opts: {
  exerciseId: string
  name: string
  logged: WorkoutSet
  activeSets: WorkoutSet[]
  sessions: WorkoutSession[]
  activeId?: string | null
}): TrainTip | null {
  const history = recentAnchors(opts.sessions, opts.exerciseId, opts.activeId, 1)
  const last = history[0]
  const logged = opts.logged
  const w = roundHalf(logged.weightKg)
  const sameBand = Boolean(last && last.weightKg > 0 && Math.abs(last.weightKg - w) <= 2.5)
  const target = sameBand && last ? last.reps : 8
  const alreadyUp = Boolean(last && last.weightKg > 0 && w > last.weightKg + 0.2)
  const today = opts.activeSets.filter((s) => s.exerciseId === opts.exerciseId)
  const firstToday = today[0]
  const climbedToday = Boolean(
    firstToday && logged.id !== firstToday.id && w > firstToday.weightKg + 0.2
  )
  const progressed = alreadyUp || climbedToday

  let line: string
  let suggested: number | undefined

  if (logged.outcome === 'fail') {
    const next = roundHalf(w - 2.5)
    if (w >= 5 && next >= 2.5) {
      line = '呢組有啲重，下組可以減 2.5kg'
      suggested = next
    } else {
      line = '呢組有啲重，下組保持重量'
      suggested = w > 0 ? w : undefined
    }
  } else if (logged.outcome === 'half') {
    line = '半組都得，下組保持重量'
    suggested = w > 0 ? w : undefined
  } else if (target > 1 && logged.reps === target - 1) {
    line = '差 1 下，下組保持重量'
    suggested = w > 0 ? w : undefined
  } else if (w > 0 && logged.reps > 0 && logged.reps <= 5) {
    const next = roundHalf(w - 2.5)
    if (w >= 5 && next >= 2.5) {
      line = '呢組有啲重，下組可以減 2.5kg'
      suggested = next
    } else {
      line = '呢組有啲重，下組保持重量'
      suggested = w
    }
  } else if (logged.reps >= target && logged.reps >= 8 && w > 0 && !progressed) {
    line = '呢組穩，下組可以加 2.5kg'
    suggested = roundHalf(w + 2.5)
  } else if (logged.reps >= 8 && progressed) {
    line = '呢組穩，下組保持呢個重量'
    suggested = w
  } else if (w <= 0 && logged.reps >= 8) {
    line = '呢組穩，下組試多 1 下'
  } else {
    line = '未打齊，下組保持重量'
    suggested = w > 0 ? w : undefined
  }

  return {
    id: `between:${logged.id}`,
    lines: [line],
    suggestedWeightKg: suggested,
    source: 'rules',
  }
}

export type AskSnapshot = {
  weightKg: number
  reps: number
  outcome?: WorkoutSet['outcome']
}

function cleanAskName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, 24) || '呢個動作'
}

function snapshotSet(exerciseId: string, name: string, row: AskSnapshot, id: string): WorkoutSet {
  return {
    id,
    exerciseId,
    exerciseName: name,
    setIndex: 1,
    weightKg: row.weightKg,
    reps: row.reps,
    outcome: row.outcome,
    completedAt: new Date(0).toISOString(),
  }
}

/** Rebuild a rules tip from the small snapshot sent when someone taps 「問 AI」. */
export function tipForAsk(opts: {
  kind: 'open' | 'between'
  exerciseId: string
  name: string
  recent: AskSnapshot[]
  today: AskSnapshot[]
}): TrainTip | null {
  const name = cleanAskName(opts.name)
  const sessions: WorkoutSession[] = opts.recent.slice(0, 3).map((row, i) => {
    const ended = new Date(Date.now() - (i + 1) * 86_400_000).toISOString()
    const set = snapshotSet(opts.exerciseId, name, row, `ask-h-${i}`)
    set.completedAt = ended
    return {
      id: `ask-h-${i}`,
      startedAt: ended,
      endedAt: ended,
      sets: [set],
    }
  })
  if (opts.kind === 'open') {
    return buildOpenTip({
      exerciseId: opts.exerciseId,
      name,
      sessions,
      activeId: 'ask-active',
    })
  }
  const todaySets = opts.today.slice(0, 12).map((row, i) =>
    snapshotSet(opts.exerciseId, name, row, `ask-t-${i}`)
  )
  const logged = todaySets[todaySets.length - 1]
  if (!logged) return null
  return buildBetweenSetTip({
    exerciseId: opts.exerciseId,
    name,
    logged,
    activeSets: todaySets,
    sessions,
    activeId: 'ask-active',
  })
}

/**
 * Slightly longer reply for an explicit 「問 AI」 tap.
 * Still rules — callers must not send this to a model on the default path.
 */
export function buildAskStub(tip: TrainTip | null, name: string): string {
  const who = name.trim() || '呢個動作'
  if (!tip || tip.lines.length === 0) {
    return `${who} 未有足夠紀錄。今日照手感記低，下次先比較。`
  }
  const base = tip.lines[0]
  if (base.includes('減') || base.includes('輕少少') || base.includes('偏重')) {
    return `${base}。打齊先至再加返。`
  }
  if (base.includes('加') || base.includes('今日試')) {
    return `${base}。第一下穩先做齊。`
  }
  if (base.includes('差') || base.includes('保持')) {
    return `${base}。唔使勉強加。`
  }
  return base
}

function templateIsLegs(templateId?: string) {
  if (!templateId) return false
  return /leg|lower|腿|下身/.test(templateId)
}

function focusBucket(muscle: string | undefined): string | null {
  if (!muscle) return null
  if (LEG_MUSCLES.has(muscle)) return '腿'
  if (PUSH_MUSCLES.has(muscle)) return '推'
  if (PULL_MUSCLES.has(muscle)) return '拉'
  return null
}

function focusLine(current: WorkoutSession): string | null {
  const counts = new Map<string, number>()
  for (const set of current.sets) {
    const bucket = focusBucket(exerciseById(set.exerciseId)?.muscle)
    if (!bucket) continue
    counts.set(bucket, (counts.get(bucket) || 0) + 1)
  }
  const total = current.sets.length || 1
  const legShare = (counts.get('腿') || 0) / total
  if (templateIsLegs(current.templateId) || legShare >= 0.5) {
    return '腿日完成，下一次建議休息或輕練'
  }
  const pushShare = (counts.get('推') || 0) / total
  const pullShare = (counts.get('拉') || 0) / total
  if (pushShare >= 0.5 && pushShare >= pullShare) return '推日完成，下一次可以換拉或者休息'
  if (pullShare >= 0.5) return '拉日完成，下一次可以換推或者休息'
  return null
}

function trainedYesterday(current: WorkoutSession, history: WorkoutSession[]) {
  const today = hkDayKey(new Date(current.endedAt || current.startedAt))
  const prevDay = previousHkDay(today)
  return history.some((session) => {
    if (!session.endedAt || session.id === current.id) return false
    return hkDayKey(new Date(session.endedAt)) === prevDay
  })
}

/** One or two lines for the existing finish card. */
export function buildFinishLines(current: WorkoutSession, history: WorkoutSession[]): string[] {
  const lines: string[] = []
  const prev = finishedSessions(history, current.id)[0]
  const volume = volumeOf(current.sets)
  if (prev && volume > 0) {
    const prevVolume = volumeOf(prev.sets)
    if (prevVolume > 0) {
      const pct = Math.round(((volume - prevVolume) / prevVolume) * 100)
      if (pct >= 3) lines.push(`今日容量比上次高 ${pct}%`)
      else if (pct <= -3) lines.push(`今日容量比上次低 ${Math.abs(pct)}%`)
      else lines.push('今日容量同上次差唔多')
    }
  }

  const focus = focusLine(current)
  if (focus) lines.push(focus)
  else if (trainedYesterday(current, history) && lines.length < 2) {
    lines.push('連續兩日，下一次建議休息或輕練')
  }

  return lines.slice(0, 2)
}
