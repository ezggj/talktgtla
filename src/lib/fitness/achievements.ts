/** Fitness + chat-adjacent achievements (localStorage). */

import type { MealEntry, WorkoutSession, PRMap } from './storage'
import { computeStreak } from './streaks'

export const FITNESS_ACH_KEY = 'talktgtla-fitness-achievements-v1'

export type FitnessAchievementId =
  | 'first_workout'
  | 'five_workouts'
  | 'first_pr'
  | 'streak_3'
  | 'streak_7'
  | 'first_meal'
  | 'protein_goal_day'
  | 'plan_week_half'

export type FitnessAchievement = {
  id: FitnessAchievementId
  title: string
  description: string
  emoji: string
}

export const FITNESS_ACHIEVEMENTS: FitnessAchievement[] = [
  {
    id: 'first_workout',
    title: '開齋',
    description: '完成第一次訓練',
    emoji: '🏋️',
  },
  {
    id: 'five_workouts',
    title: '五場入門',
    description: '累積完成 5 次訓練',
    emoji: '🔥',
  },
  {
    id: 'first_pr',
    title: '破紀錄',
    description: '寫低第一個 PR',
    emoji: '🏆',
  },
  {
    id: 'streak_3',
    title: '連練 3 日',
    description: '連續三日都有訓練',
    emoji: '📅',
  },
  {
    id: 'streak_7',
    title: '一連七日',
    description: '連續七日打卡',
    emoji: '💎',
  },
  {
    id: 'first_meal',
    title: '第一餐',
    description: '記低第一餐飲食',
    emoji: '🍱',
  },
  {
    id: 'protein_goal_day',
    title: '蛋白達標日',
    description: '單日蛋白達到目標',
    emoji: '💪',
  },
  {
    id: 'plan_week_half',
    title: '課表過半',
    description: '一星期課表完成一半或以上',
    emoji: '✨',
  },
]

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadFitnessUnlocked(): Set<FitnessAchievementId> {
  if (typeof window === 'undefined') return new Set()
  return new Set(safeParse<FitnessAchievementId[]>(localStorage.getItem(FITNESS_ACH_KEY), []))
}

export function saveFitnessUnlocked(ids: Set<FitnessAchievementId>) {
  localStorage.setItem(FITNESS_ACH_KEY, JSON.stringify([...ids]))
}

export function fitnessAchievementById(id: FitnessAchievementId) {
  return FITNESS_ACHIEVEMENTS.find((a) => a.id === id)
}

export function evaluateFitnessAchievements(input: {
  sessions: WorkoutSession[]
  meals: MealEntry[]
  prs: PRMap
  proteinGoal?: number
  planDoneRatio?: number
  already?: Set<FitnessAchievementId>
}): FitnessAchievementId[] {
  const already = input.already ?? loadFitnessUnlocked()
  const finished = input.sessions.filter((s) => s.endedAt)
  const streak = computeStreak(input.sessions)
  const newly: FitnessAchievementId[] = []
  const tryUnlock = (id: FitnessAchievementId, ok: boolean) => {
    if (ok && !already.has(id)) newly.push(id)
  }

  tryUnlock('first_workout', finished.length >= 1)
  tryUnlock('five_workouts', finished.length >= 5)
  tryUnlock('first_pr', Object.keys(input.prs).length >= 1)
  tryUnlock('streak_3', streak >= 3)
  tryUnlock('streak_7', streak >= 7)
  tryUnlock('first_meal', input.meals.length >= 1)

  if (input.proteinGoal && input.proteinGoal > 0) {
    const byDay = new Map<string, number>()
    for (const m of input.meals) {
      const k = m.createdAt.slice(0, 10)
      byDay.set(k, (byDay.get(k) || 0) + m.macros.protein)
    }
    const hit = [...byDay.values()].some((p) => p >= input.proteinGoal!)
    tryUnlock('protein_goal_day', hit)
  }

  if (input.planDoneRatio != null) {
    tryUnlock('plan_week_half', input.planDoneRatio >= 0.5)
  }

  return newly
}

export function unlockFitnessAchievements(ids: FitnessAchievementId[]): Set<FitnessAchievementId> {
  const merged = loadFitnessUnlocked()
  for (const id of ids) merged.add(id)
  saveFitnessUnlocked(merged)
  return merged
}
