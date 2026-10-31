/** 一週口語總結 — spoken Cantonese card copy. */

import type { MealEntry, WorkoutSession } from './storage'
import { weekConsistency } from './streaks'

function volumeOf(s: WorkoutSession) {
  return s.sets.reduce((a, x) => a + x.weightKg * x.reps, 0)
}

export type WeeklySummary = {
  title: string
  lines: string[]
  vibe: 'empty' | 'light' | 'solid' | 'fire'
  trainedDays: number
  sessions: number
  volume: number
  proteinAvg: number
  kcalAvg: number
}

export function buildWeeklySummary(
  sessions: WorkoutSession[],
  meals: MealEntry[],
  proteinGoal = 150
): WeeklySummary {
  const now = Date.now()
  const weekAgo = now - 7 * 86400000
  const weekSessions = sessions.filter(
    (s) => s.endedAt && new Date(s.startedAt).getTime() >= weekAgo
  )
  const weekMeals = meals.filter((m) => new Date(m.createdAt).getTime() >= weekAgo)
  const w = weekConsistency(sessions)
  const vol = weekSessions.reduce((a, s) => a + volumeOf(s), 0)
  const daysWithMeal = new Set(weekMeals.map((m) => m.createdAt.slice(0, 10)))
  const proteinByDay = new Map<string, number>()
  const kcalByDay = new Map<string, number>()
  for (const m of weekMeals) {
    const d = m.createdAt.slice(0, 10)
    proteinByDay.set(d, (proteinByDay.get(d) || 0) + m.macros.protein)
    kcalByDay.set(d, (kcalByDay.get(d) || 0) + m.macros.kcal)
  }
  const mealDays = Math.max(1, daysWithMeal.size)
  const proteinAvg = Math.round(
    [...proteinByDay.values()].reduce((a, b) => a + b, 0) / mealDays
  )
  const kcalAvg = Math.round([...kcalByDay.values()].reduce((a, b) => a + b, 0) / mealDays)

  const lines: string[] = []
  let vibe: WeeklySummary['vibe'] = 'empty'
  let title = '呢個星期有啲靜'

  if (weekSessions.length === 0 && weekMeals.length === 0) {
    lines.push('未有訓練同飲食紀錄——去開一場、影一餐，星期就會有故事。')
    lines.push('唔使爆機，一星期一兩日都夠型。')
  } else {
    if (w.trainedCount >= 4) {
      title = '呢個星期好勤力'
      vibe = 'fire'
      lines.push(`練咗 ${w.trainedCount} 日、一共 ${weekSessions.length} 場——節奏穩陣。`)
    } else if (w.trainedCount >= 2) {
      title = '呢個星期有進度'
      vibe = 'solid'
      lines.push(`開咗 ${weekSessions.length} 場（${w.trainedCount} 日有落場）——繼續咁樣就得。`)
    } else if (weekSessions.length > 0) {
      title = '呢個星期起步咗'
      vibe = 'light'
      lines.push(`有 ${weekSessions.length} 場訓練——一開波就贏半場。`)
    } else {
      title = '呢個星期偏飲食'
      vibe = 'light'
      lines.push('訓練未開波，不過飲食有記——都係跟住身體。')
    }

    if (vol > 0) {
      lines.push(`總容量大約 ${Math.round(vol).toLocaleString()} kg·reps——重量同次數都有落。`)
    }
    if (weekMeals.length > 0) {
      const hitDays = [...proteinByDay.values()].filter((p) => p >= proteinGoal * 0.9).length
      const hit =
        proteinAvg >= proteinGoal * 0.85
          ? '蛋白平均差不多到標'
          : proteinAvg >= proteinGoal * 0.55
            ? '蛋白有記，再補一補就靚'
            : '蛋白偏少——茶記加碟菜／會所雞胸都得'
      lines.push(
        `記咗 ${weekMeals.length} 餐、${daysWithMeal.size} 日有記；平均約 ${proteinAvg}g 蛋白、${kcalAvg} kcal——其中約 ${hitDays} 日到標。${hit}。`
      )
    }
    if (w.streak > 0) {
      lines.push(`而家連練 ${w.streak} 日——聽日再嚟就繼續亮。`)
    }
  }

  return {
    title,
    lines: lines.slice(0, 4),
    vibe,
    trainedDays: w.trainedCount,
    sessions: weekSessions.length,
    volume: vol,
    proteinAvg: weekMeals.length ? proteinAvg : 0,
    kcalAvg: weekMeals.length ? kcalAvg : 0,
  }
}

/** 一週蛋白達標口語總結 — 飲食頁專用，更貼蛋白進度。 */
export type ProteinWeekSummary = {
  title: string
  lines: string[]
  vibe: WeeklySummary['vibe']
  daysLogged: number
  daysHit: number
  avgProtein: number
  goal: number
  pct: number
}

export function buildProteinWeekSummary(
  meals: MealEntry[],
  proteinGoal = 150
): ProteinWeekSummary {
  const now = Date.now()
  const weekAgo = now - 7 * 86400000
  const weekMeals = meals.filter((m) => new Date(m.createdAt).getTime() >= weekAgo)
  const proteinByDay = new Map<string, number>()
  for (const m of weekMeals) {
    const d = m.createdAt.slice(0, 10)
    proteinByDay.set(d, (proteinByDay.get(d) || 0) + m.macros.protein)
  }
  const days = [...proteinByDay.entries()]
  const daysLogged = days.length
  const daysHit = days.filter(([, p]) => p >= proteinGoal * 0.9).length
  const avgProtein = daysLogged
    ? Math.round(days.reduce((a, [, p]) => a + p, 0) / daysLogged)
    : 0
  const pct = proteinGoal > 0 ? Math.round((avgProtein / proteinGoal) * 100) : 0

  let vibe: WeeklySummary['vibe'] = 'empty'
  let title = '呢個星期蛋白仲未開波'
  const lines: string[] = []

  if (daysLogged === 0) {
    lines.push('未有飲食紀錄——影一餐或者撳會所蛋白餐模板，星期就有口語總結。')
    lines.push(`目標大概每日 ${proteinGoal}g 蛋白；茶記加碟菜／會所雞胸都得。`)
  } else if (daysHit >= 5 || pct >= 95) {
    title = '呢個星期蛋白好穩'
    vibe = 'fire'
    lines.push(`有記 ${daysLogged} 日，其中約 ${daysHit} 日到標（≥9 成目標）。`)
    lines.push(`有記日子平均約 ${avgProtein}g（目標 ${proteinGoal}g，大約 ${pct}%）——繼續咁樣就靚。`)
  } else if (pct >= 70 || daysHit >= 2) {
    title = '呢個星期蛋白有進度'
    vibe = 'solid'
    lines.push(`記咗 ${daysLogged} 日，平均約 ${avgProtein}g 蛋白——再補一陣就到標。`)
    lines.push('差一截就加會所雞胸／乳清，或者茶記轉白切雞飯。')
  } else {
    title = '呢個星期蛋白偏少'
    vibe = 'light'
    lines.push(`有記 ${daysLogged} 日，平均約 ${avgProtein}g——未夠 ${proteinGoal}g 目標。`)
    lines.push('唔使完美：加一餐會所蛋白碗或者蛋白粉，聽日數字就會靚啲。')
  }

  if (daysLogged > 0 && daysHit === 0 && pct >= 55) {
    lines.push('未算「到標日」，但方向啱——穩陣啲就入 solid。')
  }

  return {
    title,
    lines: lines.slice(0, 3),
    vibe,
    daysLogged,
    daysHit,
    avgProtein,
    goal: proteinGoal,
    pct,
  }
}
