'use client'

import { cn } from '@/lib/utils'
import type { WeekDay } from '@/lib/fitness/streaks'

/** Soft 7-day consistency strip — Linear-quiet dots. */
export function WeekDots({
  days,
  className,
  size = 'md',
}: {
  days: WeekDay[]
  className?: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  return (
    <div className={cn('flex items-end justify-between gap-1', className)} role="list" aria-label="呢個星期練咗邊幾日">
      {days.map((d) => (
        <div key={d.key} className="flex flex-col items-center gap-1.5" role="listitem">
          <span
            className={cn(
              'rounded-full transition-colors',
              dim,
              d.trained
                ? 'bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
                : 'bg-[#e7e5e4]',
              d.isToday && !d.trained && 'ring-2 ring-accent/30 ring-offset-1 ring-offset-surface'
            )}
            title={`${d.label}${d.trained ? ' · 練咗' : d.isToday ? ' · 今日' : ''}`}
            aria-label={`${d.label}${d.trained ? ' 練咗' : ' 未練'}`}
          />
          <span
            className={cn(
              'text-[10px] tabular-nums',
              d.isToday ? 'font-semibold text-accent' : 'text-muted'
            )}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}
