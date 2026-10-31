/** 月度回顧 — 練幾多、蛋白點，廣東話口語。 */

import type { MealEntry, WorkoutSession } from './storage'
import { dayKeyFromIso, todayKey } from './storage'

function volumeOf(s: WorkoutSession) {
  return s.sets.reduce((a, x) => a + x.weightKg * x.reps, 0)
}

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end, label: `${d.getFullYear()}年${d.getMonth() + 1}月` }
}

export type MonthlySummary = {
  title: string
  subtitle: string
  lines: string[]
  vibe: 'empty' | 'light' | 'solid' | 'fire'
  monthLabel: string
  trainedDays: number
  sessions: number
  volume: number
  proteinAvg: number
  kcalAvg: number
  mealDays: number
}

export function buildMonthlySummary(
  sessions: WorkoutSession[],
  meals: MealEntry[],
  proteinGoal = 150,
  at = new Date()
): MonthlySummary {
  const { start, end, label } = monthBounds(at)
  const startMs = start.getTime()
  const endMs = end.getTime()

  const monthSessions = sessions.filter((s) => {
    if (!s.endedAt) return false
    const t = new Date(s.startedAt).getTime()
    return t >= startMs && t <= endMs
  })
  const monthMeals = meals.filter((m) => {
    const t = new Date(m.createdAt).getTime()
    return t >= startMs && t <= endMs
  })

  const trained = new Set(monthSessions.map((s) => dayKeyFromIso(s.startedAt)))
  const vol = monthSessions.reduce((a, s) => a + volumeOf(s), 0)

  const proteinByDay = new Map<string, number>()
  const kcalByDay = new Map<string, number>()
  for (const m of monthMeals) {
    const d = dayKeyFromIso(m.createdAt)
    proteinByDay.set(d, (proteinByDay.get(d) || 0) + m.macros.protein)
    kcalByDay.set(d, (kcalByDay.get(d) || 0) + m.macros.kcal)
  }
  const mealDays = proteinByDay.size
  const denom = Math.max(1, mealDays)
  const proteinAvg = Math.round(
    [...proteinByDay.values()].reduce((a, b) => a + b, 0) / denom
  )
  const kcalAvg = Math.round(
    [...kcalByDay.values()].reduce((a, b) => a + b, 0) / denom
  )

  const lines: string[] = []
  let vibe: MonthlySummary['vibe'] = 'empty'
  let title = `${label} · 未開波`
  let subtitle = '練一場、影一餐，呢個月就會有故事'

  if (monthSessions.length === 0 && monthMeals.length === 0) {
    lines.push('呢個月仲未有訓練同飲食紀錄。')
    lines.push('唔使每日爆機——一星期一兩日都夠型。')
  } else {
    if (trained.size >= 12) {
      title = `${label} · 好勤力`
      vibe = 'fire'
      subtitle = `練咗 ${trained.size} 日、一共 ${monthSessions.length} 場`
      lines.push(`節奏好穩——成個月有 ${trained.size} 日落場。`)
    } else if (trained.size >= 6) {
      title = `${label} · 有進度`
      vibe = 'solid'
      subtitle = `${trained.size} 日 · ${monthSessions.length} 場`
      lines.push(`開咗 ${monthSessions.length} 場——繼續咁樣就得。`)
    } else if (monthSessions.length > 0) {
      title = `${label} · 起步咗`
      vibe = 'light'
      subtitle = `${trained.size} 日 · ${monthSessions.length} 場`
      lines.push(`有 ${monthSessions.length} 場訓練——一開波就贏半場。`)
    } else {
      title = `${label} · 偏飲食`
      vibe = 'light'
      subtitle = `記咗 ${monthMeals.length} 餐`
      lines.push('訓練未開波，不過飲食有記——都係跟住身體。')
    }

    if (vol > 0) {
      lines.push(`總容量大約 ${Math.round(vol).toLocaleString()} kg·reps。`)
    }
    if (monthMeals.length > 0) {
      const hitDays = [...proteinByDay.values()].filter((p) => p >= proteinGoal * 0.9).length
      const hit =
        proteinAvg >= proteinGoal * 0.85
          ? '蛋白平均差不多到標'
          : proteinAvg >= proteinGoal * 0.55
            ? '蛋白有記，再補一補就靚'
            : '蛋白偏少——茶記加碟菜／會所雞胸都得'
      lines.push(
        `飲食 ${monthMeals.length} 餐、${mealDays} 日有記；日均約 ${proteinAvg}g 蛋白、${kcalAvg} kcal——約 ${hitDays} 日到標。${hit}。`
      )
    }
  }

  const today = todayKey(at)
  if (trained.size > 0 && !trained.has(today) && at.getDate() > 3) {
    lines.push('今日未打卡都冇所謂——聽日再嚟都得。')
  }

  return {
    title,
    subtitle,
    lines: lines.slice(0, 4),
    vibe,
    monthLabel: label,
    trainedDays: trained.size,
    sessions: monthSessions.length,
    volume: vol,
    proteinAvg: monthMeals.length ? proteinAvg : 0,
    kcalAvg: monthMeals.length ? kcalAvg : 0,
    mealDays,
  }
}
