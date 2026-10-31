'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Play, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { computePlanWeekProgress } from '@/lib/fitness/plan-progress'
import {
  loadActivePlan,
  pickTodayOrNextDay,
  type StoredPlanMeta,
} from '@/lib/fitness/plan-store'
import { loadSessions } from '@/lib/fitness/storage'
import { cn } from '@/lib/utils'

type Props = {
  /** When set, start in-app instead of navigating */
  onStartDay?: (planTitle: string, exerciseIds: string[], dayFocus: string) => void
  /** Bump to re-read localStorage after external save */
  refreshKey?: number
  compact?: boolean
  className?: string
}

export function ActivePlanPanel({ onStartDay, refreshKey = 0, compact, className }: Props) {
  const [meta, setMeta] = useState<StoredPlanMeta | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setMeta(loadActivePlan())
  }, [refreshKey, tick])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'talktgtla-active-plan-v1') setTick((n) => n + 1)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!meta?.plan?.days?.length) {
    if (compact) return null
    return (
      <Card className={cn('border-dashed', className)}>
        <Badge tone="muted">我嘅課表</Badge>
        <CardTitle className="mt-2 text-lg">未跟緊任何課表</CardTitle>
        <CardDesc className="mt-2 mb-3">
          揀下面「週模板」跟住一套，或者去「我」頁用目標出課表。跟住之後呢度有進度，撳掣就開波。
        </CardDesc>
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          去出課表
        </Link>
      </Card>
    )
  }

  const sessions = loadSessions()
  const progress = computePlanWeekProgress(meta.plan, sessions)
  const pick = pickTodayOrNextDay(meta.plan)
  const next = progress.nextIncomplete
  const startDay = next?.day || pick?.day
  const exerciseIds = startDay?.exercises.map((e) => e.exerciseId) || []
  const isTodaySlot = next?.isToday || pick?.isToday

  const start = () => {
    if (!startDay || exerciseIds.length === 0) return
    if (onStartDay) {
      onStartDay(meta.plan.title, exerciseIds, startDay.focus)
      return
    }
    window.location.href = `/train?plan=${encodeURIComponent(meta.plan.title)}&exercises=${encodeURIComponent(exerciseIds.join(','))}`
  }

  return (
    <Card className={cn('relative overflow-hidden border-accent/25 bg-accent-soft/20', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent-soft),_transparent_55%)] pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge tone="accent">跟住緊</Badge>
            <CardTitle className="mt-2 text-lg leading-snug truncate">{meta.plan.title}</CardTitle>
            {!compact && (
              <CardDesc className="mt-1.5 line-clamp-2">{meta.plan.summary}</CardDesc>
            )}
          </div>
          <Badge tone={progress.doneCount > 0 ? 'accent' : 'muted'}>
            {progress.doneCount}/{progress.total} 日
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {progress.days.map((d) => (
            <span
              key={`${d.day.dayIndex}-${d.day.focus}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border',
                d.done
                  ? 'bg-accent-soft text-accent border-accent/25'
                  : d.isToday
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30'
                    : 'bg-surface text-muted border-border'
              )}
              title={`${d.day.focus} · ${d.slotDate}`}
            >
              {d.done ? <Check className="h-3 w-3" /> : null}
              {d.day.nameZh.replace('星期', '')}
              <span className="opacity-70">·{d.day.focus}</span>
            </span>
          ))}
        </div>

        {startDay && exerciseIds.length > 0 && (
          <Button className="w-full" onClick={start}>
            <Play className="h-4 w-4" />
            {progress.doneCount >= progress.total
              ? '再練一堂'
              : isTodaySlot
                ? `開波 · 今日 ${startDay.focus}`
                : `開波 · ${startDay.nameZh} ${startDay.focus}`}
          </Button>
        )}

        {!compact && (
          <ul className="space-y-1.5 pt-1 border-t border-border/80">
            {meta.plan.days.map((d) => {
              const done = progress.days.find((x) => x.day.dayIndex === d.dayIndex && x.day.focus === d.focus)?.done
              const ids = d.exercises.map((e) => e.exerciseId)
              return (
                <li
                  key={`row-${d.dayIndex}-${d.focus}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className={cn('font-medium', done && 'text-accent')}>
                    {done ? '✓ ' : ''}
                    {d.nameZh} · {d.focus}
                    <span className="text-muted font-normal"> · {d.exercises.length} 動作</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-accent font-semibold hover:underline touch-manipulation"
                    onClick={() => {
                      if (onStartDay) onStartDay(meta.plan.title, ids, d.focus)
                      else
                        window.location.href = `/train?plan=${encodeURIComponent(meta.plan.title)}&exercises=${encodeURIComponent(ids.join(','))}`
                    }}
                  >
                    開波
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
