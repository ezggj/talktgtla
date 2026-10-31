'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  COMMON_BAR_KG,
  formatPlateHint,
  stackPlates,
} from '@/lib/fitness/plates'

/** Compact 「槓片點砌」 under weight input for 槓鈴 moves */
export function PlateHint({
  weightKg,
  onPickTotal,
  className,
}: {
  weightKg: number
  /** Optional: tap a quick total to fill weight */
  onPickTotal?: (kg: number) => void
  className?: string
}) {
  const [barKg, setBarKg] = useState<(typeof COMMON_BAR_KG)[number]>(20)
  const [open, setOpen] = useState(true)
  const stack = useMemo(() => stackPlates(weightKg, barKg), [weightKg, barKg])
  const hint = formatPlateHint(stack)

  const quickTotals = useMemo(() => {
    const base = [barKg, barKg + 10, barKg + 20, barKg + 40, barKg + 60, barKg + 80]
    return base.filter((t, i, a) => a.indexOf(t) === i)
  }, [barKg])

  return (
    <div
      className={cn(
        'mt-2 rounded-2xl border border-border/80 bg-surface-muted/60 px-2.5 py-2',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-semibold text-muted touch-manipulation"
          aria-expanded={open}
        >
          槓片點砌 {open ? '▾' : '▸'}
        </button>
        <div className="flex gap-1">
          {COMMON_BAR_KG.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBarKg(b)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] border touch-manipulation tabular-nums',
                barKg === b
                  ? 'border-accent bg-accent-soft text-accent font-semibold'
                  : 'border-border text-muted'
              )}
            >
              {b}kg 槓
            </button>
          ))}
        </div>
      </div>
      {open && (
        <>
          <p
            className={cn(
              'mt-1.5 text-[12px] leading-snug tabular-nums',
              stack.tooLight ? 'text-warning' : 'text-foreground/90'
            )}
          >
            {hint}
          </p>
          {onPickTotal && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quickTotals.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPickTotal(t)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[10px] font-medium tabular-nums touch-manipulation border',
                    Math.abs(weightKg - t) < 0.01
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-muted hover:text-foreground'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
