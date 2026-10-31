import type { WorkoutSession, WorkoutSet } from './storage'
import { exerciseById } from './exercises'

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

function topVolumeExercise(sets: WorkoutSet[]) {
  const map = new Map<string, { name: string; vol: number; sets: number }>()
  for (const s of sets) {
    const cur = map.get(s.exerciseId) || { name: s.exerciseName, vol: 0, sets: 0 }
    cur.vol += s.weightKg * s.reps
    cur.sets += 1
    map.set(s.exerciseId, cur)
  }
  return [...map.entries()].sort((a, b) => b[1].vol - a[1].vol)[0] || null
}

function dropOffSets(sets: WorkoutSet[]) {
  // last set of an exercise much weaker than first → maybe rest too short / fatigue
  const byEx = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    const list = byEx.get(s.exerciseId) || []
    list.push(s)
    byEx.set(s.exerciseId, list)
  }
  for (const [id, xs] of byEx) {
    if (xs.length < 3) continue
    const first = xs[0]
    const last = xs[xs.length - 1]
    const firstLoad = first.weightKg * first.reps
    const lastLoad = last.weightKg * last.reps
    if (firstLoad > 0 && lastLoad / firstLoad <= 0.7) {
      return exerciseById(id)?.nameZh || xs[0].exerciseName
    }
  }
  return null
}

function weightsFlat(all: WorkoutSession[], current: WorkoutSession) {
  const finished = all.filter((s) => s.endedAt && s.id !== current.id).slice(0, 8)
  if (finished.length < 2) return null as string | null
  const exIds = [...new Set(current.sets.map((s) => s.exerciseId))]
  for (const ex of exIds) {
    const curMax = Math.max(0, ...current.sets.filter((s) => s.exerciseId === ex).map((s) => s.weightKg))
    if (curMax <= 0) continue
    const historyMax: number[] = []
    for (const sess of finished.slice(0, 3)) {
      const xs = sess.sets.filter((s) => s.exerciseId === ex)
      if (!xs.length) continue
      historyMax.push(Math.max(...xs.map((s) => s.weightKg)))
    }
    if (historyMax.length >= 2 && historyMax.every((w) => w === curMax)) {
      return exerciseById(ex)?.nameZh || current.sets.find((s) => s.exerciseId === ex)?.exerciseName || null
    }
  }
  return null
}

function prCandidates(current: WorkoutSession, history: WorkoutSession[]) {
  const names: string[] = []
  for (const ex of [...new Set(current.sets.map((s) => s.exerciseId))]) {
    const curMax = Math.max(...current.sets.filter((s) => s.exerciseId === ex).map((s) => s.weightKg), 0)
    if (curMax <= 0) continue
    let histMax = 0
    for (const sess of history) {
      if (!sess.endedAt || sess.id === current.id) continue
      for (const s of sess.sets) {
        if (s.exerciseId === ex) histMax = Math.max(histMax, s.weightKg)
      }
    }
    if (curMax > histMax) {
      names.push(exerciseById(ex)?.nameZh || current.sets.find((s) => s.exerciseId === ex)!.exerciseName)
    }
  }
  return names.slice(0, 2)
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
  const compareLabel = sameTpl.length
    ? '對上同一套課表'
    : week.length
      ? '近七日平均'
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
  const top = topVolumeExercise(current.sets)
  const flatEx = weightsFlat(history, current)
  const dropEx = dropOffSets(current.sets)
  const prs = prCandidates(current, history)
  const uniqueEx = new Set(current.sets.map((s) => s.exerciseId)).size

  if (finishedBefore === 0) {
    tips.push('第一次記低訓練，做得好。之後每次完場都會同歷史比一比，慢慢見到進步。')
  }

  if (prs.length) {
    tips.push(
      prs.length === 1
        ? `「${prs[0]}」今日重過歷史紀錄——記低感覺，下星期可以試穩呢個重量再多一下。`
        : `「${prs[0]}」「${prs[1]}」都破咗舊最佳——聽日瞓夠同食夠蛋白，畀身體追。`
    )
  }

  if (top && top[1].sets >= 3) {
    tips.push(
      `今日主力似係「${top[1].name}」（${top[1].sets} 組、約 ${Math.round(top[1].vol).toLocaleString()} 容量）——收工記得輕力伸展相關肌群。`
    )
  }

  if (volumeDeltaPct != null && volumeDeltaPct >= 15) {
    tips.push(
      `容量比${compareLabel || '上次'}高約 ${volumeDeltaPct}%——做得好，聽日如果痠痛大，可以改做輕量或者行路恢復。`
    )
  } else if (volumeDeltaPct != null && volumeDeltaPct <= -20) {
    tips.push(
      `容量輕過${compareLabel || '上次'}約 ${Math.abs(volumeDeltaPct)}%——可能係恢復日或者狀態一般，咁都得，聽朝再睇感覺。`
    )
  }

  if (dropEx) {
    tips.push(`「${dropEx}」後段組明顯輕咗——下次前幾組可以多休息 15–30 秒，保質量。`)
  }

  if (restAvg != null && restAvg <= 55 && sets >= 8) {
    tips.push(`平均休息約 ${Math.round(restAvg)} 秒偏短——如果後段力唔夠，試將大重量組休息拉到 90–120 秒。`)
  } else if (restAvg != null && restAvg >= 150 && densenessSafe(density, volume)) {
    tips.push(`組間休息偏長（約 ${Math.round(restAvg)} 秒）——如果趕時間，可以試縮到 90 秒睇吓重量穩唔穩。`)
  }

  if (dur >= 80 * 60 || sets >= 22) {
    tips.push('練得好耐／組數好多——下次可以拆成上下午兩短場，或者減 1–2 個輔助動作。')
  } else if (dur > 0 && dur <= 40 * 60 && volume > 0 && density > 90) {
    tips.push(`${Math.round(dur / 60)} 分鐘就做完、密度夠——節奏正，keep 住。`)
  }

  if (flatEx && tips.length < 4) {
    tips.push(`「${flatEx}」重量企咗幾場——下星期試 +2.5kg，或者同一重量多做 1–2 下。`)
  }

  if (uniqueEx === 1 && sets >= 4 && tips.length < 4) {
    tips.push('今日淨係練一個動作——如果仲有時間，加一個對側或者核心動作會更平衡。')
  }

  if (sets > 0 && sets < 5 && finishedBefore > 0 && tips.length < 4) {
    tips.push('今日組數偏少——下次可以再加一兩個輔助，或者同一動作多一組。')
  }

  if (tips.length === 0) {
    tips.push(
      top
        ? `紮實完成，「${top[1].name}」帶住呢場。對住歷史數字慢慢進步就得。`
        : '紮實完成。對住歷史數字慢慢進步就得，唔使急。'
    )
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

function densenessSafe(density: number, volume: number) {
  return density < 70 && volume > 0
}

export function formatDelta(pct: number | null) {
  if (pct == null) return null
  if (pct > 0) return `↑${pct}%`
  if (pct < 0) return `↓${Math.abs(pct)}%`
  return '持平'
}
