import type { WorkoutSession, WorkoutSet } from './storage'

export type WorkoutAnalysis = {
  volume: number
  sets: number
  durationSec: number
  density: number // volume per minute
  volumeDeltaPct: number | null
  durationDeltaPct: number | null
  compareLabel: string | null
  tips: string[]
  generatedAt: string
}

function volumeOf(sets: WorkoutSet[]) {
  return sets.reduce((a, s) => a + s.weightKg * s.reps, 0)
}

function durationSec(s: WorkoutSession) {
  if (!s.endedAt) return 0
  return Math.max(0, Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))
}

function pctDelta(now: number, prev: number) {
  if (prev <= 0) return null
  return Math.round(((now - prev) / prev) * 100)
}

function avgRest(sets: WorkoutSet[]) {
  const rests = sets.map((s) => s.restSec).filter((x): x is number => typeof x === 'number' && x > 0)
  if (!rests.length) return null
  return rests.reduce((a, b) => a + b, 0) / rests.length
}

function sameTemplateSessions(all: WorkoutSession[], current: WorkoutSession) {
  if (!current.templateId) return []
  return all.filter(
    (s) =>
      s.id !== current.id &&
      s.endedAt &&
      s.templateId === current.templateId
  )
}

function recentWeek(all: WorkoutSession[], current: WorkoutSession) {
  const end = new Date(current.endedAt || current.startedAt).getTime()
  const weekAgo = end - 7 * 86400000
  return all.filter(
    (s) =>
      s.id !== current.id &&
      s.endedAt &&
      new Date(s.startedAt).getTime() >= weekAgo &&
      new Date(s.startedAt).getTime() < end
  )
}

function weightsFlat(all: WorkoutSession[], current: WorkoutSession) {
  // same exercise last 3 finished sessions vs current — weight unchanged
  const finished = all.filter((s) => s.endedAt && s.id !== current.id).slice(0, 8)
  if (finished.length < 2) return false
  const exIds = [...new Set(current.sets.map((s) => s.exerciseId))]
  let flatCount = 0
  for (const ex of exIds) {
    const curMax = Math.max(0, ...current.sets.filter((s) => s.exerciseId === ex).map((s) => s.weightKg))
    if (curMax <= 0) continue
    const historyMax: number[] = []
    for (const sess of finished.slice(0, 3)) {
      const xs = sess.sets.filter((s) => s.exerciseId === ex)
      if (!xs.length) continue
      historyMax.push(Math.max(...xs.map((s) => s.weightKg)))
    }
    if (historyMax.length >= 2 && historyMax.every((w) => w === curMax)) flatCount++
  }
  return flatCount >= 1
}

/** Build post-workout analysis + HK Cantonese tips (max 4). Soft, practical, no medical claims. */
export function analyzeWorkout(
  current: WorkoutSession,
  history: WorkoutSession[]
): WorkoutAnalysis {
  const volume = volumeOf(current.sets)
  const sets = current.sets.length
  const dur = durationSec(current)
  const minutes = Math.max(dur / 60, 1 / 60)
  const density = volume / minutes
  const restAvg = avgRest(current.sets)

  const sameTpl = sameTemplateSessions(history, current)
  const week = recentWeek(history, current)
  const comparePool = sameTpl.length ? sameTpl : week
  const compareLabel = sameTpl.length
    ? '對上同一課表'
    : week.length
      ? '近 7 日平均'
      : null

  let prevVolume: number | null = null
  let prevDur: number | null = null
  if (sameTpl.length) {
    const last = sameTpl[0]
    prevVolume = volumeOf(last.sets)
    prevDur = durationSec(last)
  } else if (week.length) {
    prevVolume = week.reduce((a, s) => a + volumeOf(s.sets), 0) / week.length
    prevDur = week.reduce((a, s) => a + durationSec(s), 0) / week.length
  }

  const volumeDeltaPct =
    prevVolume != null ? pctDelta(volume, prevVolume) : null
  const durationDeltaPct = prevDur != null ? pctDelta(dur, prevDur) : null

  const tips: string[] = []
  const finishedBefore = history.filter((s) => s.endedAt && s.id !== current.id).length

  if (finishedBefore === 0) {
    tips.push('第一次記低訓練——做得好。慢慢建立節奏就得，唔使一次練到盡。')
  }

  if (volumeDeltaPct != null && volumeDeltaPct >= 20) {
    tips.push('今日容量高過上次唔少，聽日留心瞓覺同蛋白攝取，畀身體追得上。')
  } else if (volumeDeltaPct != null && volumeDeltaPct <= -20) {
    tips.push('容量輕過上次——可能係恢復日或者狀態一般，咁樣都得，聽朝再睇感覺。')
  }

  if (dur >= 75 * 60 || sets >= 20) {
    tips.push('練咗好耐／組數好多，下次組間可以再緊湊啲，或者拆開上下午兩短 session。')
  } else if (dur > 0 && dur <= 35 * 60 && volume > 0 && density > 80) {
    tips.push('時間唔長但密度夠——效率正，keep 住呢種節奏。')
  }

  if (restAvg != null && restAvg <= 60 && volumeDeltaPct != null && volumeDeltaPct >= 0) {
    tips.push('休息偏短仲頂到容量——今日強度感不錯，記得拉一拉同補水。')
  }

  if (weightsFlat(history, current)) {
    tips.push('有啲動作重量企咗一陣，下星期可以試 +2.5kg，或者同一重量多做 1 次。')
  }

  if (sets > 0 && sets < 6 && finishedBefore > 0) {
    tips.push('今日組數偏少——如果仲有時間，下次可以再加一兩個輔助動作。')
  }

  if (tips.length === 0) {
    tips.push('紮實完成。對住歷史數字慢慢進步就得，唔使急。')
  }

  return {
    volume: Math.round(volume),
    sets,
    durationSec: dur,
    density: Math.round(density),
    volumeDeltaPct,
    durationDeltaPct,
    compareLabel,
    tips: tips.slice(0, 4),
    generatedAt: new Date().toISOString(),
  }
}

export function formatDelta(pct: number | null) {
  if (pct == null) return null
  if (pct > 0) return `↑${pct}%`
  if (pct < 0) return `↓${Math.abs(pct)}%`
  return '持平'
}
