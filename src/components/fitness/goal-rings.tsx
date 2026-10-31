'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress'
import type { FitnessGoals, MealEntry, WorkoutSession } from '@/lib/fitness/storage'
import { isSameDay, todayKey } from '@/lib/fitness/storage'
import { weekConsistency } from '@/lib/fitness/streaks'

export function GoalRings({
  meals,
  sessions,
  goals,
  workoutGoalDays = 3,
}: {
  meals: MealEntry[]
  sessions: WorkoutSession[]
  goals: FitnessGoals
  /** Target training days per week */
  workoutGoalDays?: number
}) {
  const today = todayKey()
  const proteinToday = meals
    .filter((m) => isSameDay(m.createdAt, today))
    .reduce((a, m) => a + m.macros.protein, 0)
  const kcalToday = meals
    .filter((m) => isSameDay(m.createdAt, today))
    .reduce((a, m) => a + m.macros.kcal, 0)
  const w = weekConsistency(sessions)

  return (
    <Card className="py-4">
      <CardTitle className="text-lg mb-4">今日進度環</CardTitle>
      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing
            value={proteinToday}
            max={goals.proteinG}
            size={84}
            stroke={8}
            label={`${Math.round(proteinToday)}`}
            sublabel={`/ ${goals.proteinG}g`}
            tone="protein"
          />
          <span className="text-[11px] font-medium text-muted">今日蛋白</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing
            value={kcalToday}
            max={goals.kcal}
            size={84}
            stroke={8}
            label={`${Math.round(kcalToday)}`}
            sublabel={`/ ${goals.kcal}`}
            tone="kcal"
          />
          <span className="text-[11px] font-medium text-muted">今日卡路里</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing
            value={w.trainedCount}
            max={workoutGoalDays}
            size={84}
            stroke={8}
            label={`${w.trainedCount}`}
            sublabel={`/ ${workoutGoalDays} 日`}
            tone="accent"
          />
          <span className="text-[11px] font-medium text-muted">本週訓練</span>
        </div>
      </div>
    </Card>
  )
}
