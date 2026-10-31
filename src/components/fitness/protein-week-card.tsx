'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { ShareCardButton } from '@/components/fitness/share-card-button'
import { buildProteinWeekSummary } from '@/lib/fitness/weekly-summary'
import type { MealEntry } from '@/lib/fitness/storage'
import { cn } from '@/lib/utils'

function weekDateLabel() {
  const end = new Date()
  const start = new Date(end.getTime() - 6 * 86400000)
  const fmt = (d: Date) =>
    d.toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function ProteinWeekCard({
  meals,
  proteinGoal = 150,
  className,
  onLogMeal,
}: {
  meals: MealEntry[]
  proteinGoal?: number
  className?: string
  /** Optional CTA when week is empty — e.g. scroll to camera */
  onLogMeal?: () => void
}) {
  const s = buildProteinWeekSummary(meals, proteinGoal)
  const tone = s.vibe === 'fire' || s.vibe === 'solid' ? 'accent' : 'muted'
  const empty = s.daysLogged === 0

  return (
    <Card
      id="protein-week"
      className={cn(
        'relative overflow-hidden py-4 ring-1',
        empty
          ? 'ring-accent/25 bg-gradient-to-br from-accent-soft/70 via-surface to-surface'
          : s.vibe === 'fire'
            ? 'ring-accent/40 bg-gradient-to-br from-accent-soft/80 via-surface to-surface'
            : s.vibe === 'solid'
              ? 'ring-accent/30 bg-gradient-to-br from-accent-soft/50 via-surface to-surface'
              : 'ring-border/90',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-accent mb-0.5">一週蛋白 · 口語總結</p>
          <CardTitle className="text-lg leading-snug">{s.title}</CardTitle>
        </div>
        <Badge tone={tone === 'accent' ? 'accent' : 'muted'} className="shrink-0">
          {empty ? '未開波' : `${s.pct}%`}
        </Badge>
      </div>
      <ul className="relative space-y-2 mb-3">
        {s.lines.map((line, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
      {s.daysLogged > 0 && (
        <div className="relative">
          <div className="flex justify-between text-[11px] text-muted mb-1.5 tabular-nums">
            <span>
              平均 {s.avgProtein}g · 到標 {s.daysHit}/{s.daysLogged} 日
            </span>
            <span>{s.pct}%</span>
          </div>
          <ProgressBar value={s.avgProtein} max={Math.max(1, s.goal)} tone="protein" height="md" />
        </div>
      )}
      {s.daysLogged > 0 && (
        <div className="relative mt-3">
          <ShareCardButton
            kind="nutrition-week"
            label="出飲食週報圖"
            size="sm"
            variant="soft"
            payload={{
              title: s.title,
              dateLabel: weekDateLabel(),
              avgProtein: s.avgProtein,
              goal: s.goal,
              pct: s.pct,
              daysLogged: s.daysLogged,
              daysHit: s.daysHit,
              lines: s.lines,
              vibe: s.vibe,
            }}
          />
        </div>
      )}
      {empty && onLogMeal && (
        <button
          type="button"
          onClick={onLogMeal}
          className="relative mt-3 w-full inline-flex items-center justify-center rounded-xl bg-accent px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#0d6a63] transition touch-manipulation"
        >
          影一餐／快加 gym撚常食 →
        </button>
      )}
    </Card>
  )
}
