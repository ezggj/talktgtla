'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Check, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  dismissWeekOne,
  readWeekOneSnap,
  setWeekOneHidden,
  subscribeWeekOne,
  weekOneDoneCount,
  weekOneItems,
  weekOneServerSnap,
  weekOneVisible,
  type WeekOneId,
} from '@/lib/fitness/week-one'
import { cn } from '@/lib/utils'

function useWeekOneSnap() {
  return useSyncExternalStore(subscribeWeekOne, readWeekOneSnap, weekOneServerSnap)
}

export function WeekOneCard({
  finishedWorkouts,
  hkQuickMeals,
  variant = 'full',
}: {
  finishedWorkouts: number
  hkQuickMeals: number
  /** full = Me checklist. workout / meal = one line on that screen. */
  variant?: 'full' | 'workout' | 'meal'
}) {
  const snap = useWeekOneSnap()
  const items = weekOneItems(
    { finishedWorkouts, hkQuickMeals, hasPlan: snap.hasPlan },
    snap.flags
  )
  if (!weekOneVisible(items, snap.flags)) return null

  if (variant === 'workout') {
    const item = items.find((x) => x.id === 'workout')
    if (!item || item.done) return null
    return (
      <p className="rounded-2xl border border-accent/25 bg-accent-soft/40 px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground">
        第一週：完一場就勾到。
      </p>
    )
  }

  if (variant === 'meal') {
    const item = items.find((x) => x.id === 'hkMeal')
    if (!item || item.done) return null
    return (
      <p className="mb-2 text-[12px] leading-relaxed text-muted">
        第一週：快加一餐就勾到。成日食都計。
      </p>
    )
  }

  const done = weekOneDoneCount(items)
  const next = items.find((item) => !item.done)

  return (
    <Card className="py-4" data-testid="week-one">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-accent">第一週</p>
          <h3 className="font-serif text-lg tracking-tight mt-0.5">
            {done}/{items.length} 做咗
          </h3>
        </div>
        <button
          type="button"
          onClick={dismissWeekOne}
          className="rounded-xl p-2 text-muted hover:text-foreground touch-manipulation"
          aria-label="收起第一週清單"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl px-1 py-1.5 touch-manipulation"
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  item.done
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface text-transparent'
                )}
                aria-hidden
              >
                <Check className="h-3 w-3" />
              </span>
              <span className={cn('text-sm', item.done ? 'text-muted line-through' : 'text-foreground')}>
                {item.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {next && (
        <Link
          href={next.href}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-accent text-sm font-medium text-white touch-manipulation"
        >
          {cta(next.id)}
        </Link>
      )}
    </Card>
  )
}

function cta(id: WeekOneId) {
  if (id === 'workout') return '去練第一場'
  if (id === 'hkMeal') return '去快加一餐'
  if (id === 'goal') return '去定目標'
  return '去撳個話題'
}

export function WeekOneSettingsCard() {
  const snap = useWeekOneSnap()
  const on = !snap.flags.hidden && !snap.flags.dismissed

  return (
    <Card className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg tracking-tight">第一週清單</h3>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            四項做完會自己收起。收起咗可以喺度開返。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWeekOneHidden(on)}
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold touch-manipulation',
            on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
          )}
          aria-pressed={on}
        >
          {on ? '開' : '關'}
        </button>
      </div>
    </Card>
  )
}
