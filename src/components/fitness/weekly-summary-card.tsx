'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildWeeklySummary } from '@/lib/fitness/weekly-summary'
import type { MealEntry, WorkoutSession } from '@/lib/fitness/storage'
import { cn } from '@/lib/utils'

export function WeeklySummaryCard({
  sessions,
  meals,
  proteinGoal = 150,
  className,
}: {
  sessions: WorkoutSession[]
  meals: MealEntry[]
  proteinGoal?: number
  className?: string
}) {
  const s = buildWeeklySummary(sessions, meals, proteinGoal)
  const tone =
    s.vibe === 'fire' ? 'accent' : s.vibe === 'solid' ? 'accent' : 'muted'

  return (
    <Card className={cn('py-4', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <CardTitle className="text-lg leading-snug">{s.title}</CardTitle>
        <Badge tone={tone === 'accent' ? 'accent' : 'muted'}>呢個星期</Badge>
      </div>
      <ul className="space-y-2">
        {s.lines.map((line, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
      {(s.sessions > 0 || s.proteinAvg > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] tabular-nums text-muted">
          {s.sessions > 0 && (
            <span className="rounded-full border border-border px-2.5 py-1">
              {s.trainedDays} 日 · {s.sessions} 場
            </span>
          )}
          {s.volume > 0 && (
            <span className="rounded-full border border-border px-2.5 py-1">
              容量 {Math.round(s.volume).toLocaleString()}
            </span>
          )}
          {s.proteinAvg > 0 && (
            <span className="rounded-full border border-border px-2.5 py-1">
              蛋白均 {s.proteinAvg}g
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
