'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { buildProteinWeekSummary } from '@/lib/fitness/weekly-summary'
import type { MealEntry } from '@/lib/fitness/storage'
import { cn } from '@/lib/utils'

export function ProteinWeekCard({
  meals,
  proteinGoal = 150,
  className,
}: {
  meals: MealEntry[]
  proteinGoal?: number
  className?: string
}) {
  const s = buildProteinWeekSummary(meals, proteinGoal)
  const tone = s.vibe === 'fire' || s.vibe === 'solid' ? 'accent' : 'muted'

  return (
    <Card className={cn('py-4', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <CardTitle className="text-lg leading-snug">{s.title}</CardTitle>
        <Badge tone={tone === 'accent' ? 'accent' : 'muted'}>一週蛋白</Badge>
      </div>
      <ul className="space-y-2 mb-3">
        {s.lines.map((line, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
      {s.daysLogged > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-muted mb-1.5 tabular-nums">
            <span>
              平均 {s.avgProtein}g · 到標 {s.daysHit}/{s.daysLogged} 日
            </span>
            <span>{s.pct}%</span>
          </div>
          <ProgressBar value={s.avgProtein} max={Math.max(1, s.goal)} tone="protein" height="md" />
        </div>
      )}
    </Card>
  )
}
