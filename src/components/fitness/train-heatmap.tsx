'use client'

import { cn } from '@/lib/utils'
import type { WorkoutSession } from '@/lib/fitness/storage'
import { volumeOf } from '@/lib/fitness/analysis'
import { todayKey } from '@/lib/fitness/storage'

/** 12-week GitHub-style workout heatmap (Mon-first columns). */
export function TrainHeatmap({
  sessions,
  weeks = 12,
  className,
}: {
  sessions: WorkoutSession[]
  weeks?: number
  className?: string
}) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const days: { key: string; vol: number; trained: boolean; label: string }[] = []
  const volByDay = new Map<string, number>()
  for (const s of sessions) {
    if (!s.endedAt) continue
    const k = s.startedAt.slice(0, 10)
    volByDay.set(k, (volByDay.get(k) || 0) + volumeOf(s.sets))
  }
  const total = weeks * 7
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    const vol = volByDay.get(key) || 0
    days.push({
      key,
      vol,
      trained: vol > 0,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    })
  }
  const max = Math.max(1, ...days.map((d) => d.vol))
  const level = (vol: number) => {
    if (vol <= 0) return 0
    const r = vol / max
    if (r < 0.25) return 1
    if (r < 0.5) return 2
    if (r < 0.75) return 3
    return 4
  }
  const tones = [
    'bg-[#e7e5e4]',
    'bg-accent/25',
    'bg-accent/45',
    'bg-accent/70',
    'bg-accent',
  ]

  const first = new Date(today)
  first.setDate(first.getDate() - (total - 1))
  const pad = (first.getDay() + 6) % 7 // Mon=0
  const cells: (typeof days[0] | null)[] = [...Array(pad).fill(null), ...days]

  const cols: (typeof days[0] | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    cols.push(cells.slice(i, i + 7))
  }

  const trainedDays = days.filter((d) => d.trained).length

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto no-scrollbar">
        <div
          className="inline-flex gap-1 min-w-full justify-end"
          role="img"
          aria-label={`近 ${weeks} 週訓練熱圖，${trainedDays} 日有練`}
        >
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((cell, ri) =>
                cell ? (
                  <div
                    key={cell.key}
                    title={
                      cell.trained
                        ? `${cell.label} · 容量 ${Math.round(cell.vol).toLocaleString()}`
                        : `${cell.label} · 休息`
                    }
                    className={cn('h-2.5 w-2.5 rounded-[3px]', tones[level(cell.vol)])}
                  />
                ) : (
                  <div key={`p-${ci}-${ri}`} className="h-2.5 w-2.5 rounded-[3px] bg-transparent" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span>
          近 {weeks} 週 · {trainedDays} 日有練
        </span>
        <span className="inline-flex items-center gap-1">
          少
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={cn('inline-block h-2 w-2 rounded-[2px]', tones[l])} />
          ))}
          多
        </span>
      </div>
    </div>
  )
}

/** Alias used by some call sites */
export const WorkoutHeatmap = TrainHeatmap
