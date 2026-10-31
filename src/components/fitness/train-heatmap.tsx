'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { WorkoutSession } from '@/lib/fitness/storage'
import { volumeOf } from '@/lib/fitness/analysis'
import { dayKeyFromIso, todayKey } from '@/lib/fitness/storage'

/** GitHub-style workout calendar heatmap (Mon-first columns, local HK day). */
export function TrainHeatmap({
  sessions,
  weeks = 12,
  className,
}: {
  sessions: WorkoutSession[]
  weeks?: number
  className?: string
}) {
  const [picked, setPicked] = useState<string | null>(null)

  const { days, cols, trainedDays, max, tones, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const dayList: { key: string; vol: number; trained: boolean; label: string; month: number }[] =
      []
    const volByDay = new Map<string, number>()
    for (const s of sessions) {
      if (!s.endedAt) continue
      const k = dayKeyFromIso(s.startedAt)
      volByDay.set(k, (volByDay.get(k) || 0) + volumeOf(s.sets))
    }
    const total = weeks * 7
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = todayKey(d)
      const vol = volByDay.get(key) || 0
      dayList.push({
        key,
        vol,
        trained: vol > 0,
        label: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`,
        month: d.getMonth(),
      })
    }
    const maxVol = Math.max(1, ...dayList.map((d) => d.vol))
    const toneList = [
      'bg-[#e7e5e4]',
      'bg-accent/25',
      'bg-accent/45',
      'bg-accent/70',
      'bg-accent',
    ]
    const first = new Date(today)
    first.setDate(first.getDate() - (total - 1))
    const pad = (first.getDay() + 6) % 7 // Mon=0
    const cells: (typeof dayList[0] | null)[] = [...Array(pad).fill(null), ...dayList]
    const colList: (typeof dayList[0] | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      colList.push(cells.slice(i, i + 7))
    }
    // Month label under first column of each month
    const labels: { col: number; text: string }[] = []
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    let lastMonth = -1
    colList.forEach((col, ci) => {
      const cell = col.find((c) => c)
      if (!cell) return
      if (cell.month !== lastMonth) {
        labels.push({ col: ci, text: monthNames[cell.month] })
        lastMonth = cell.month
      }
    })
    return {
      days: dayList,
      cols: colList,
      trainedDays: dayList.filter((d) => d.trained).length,
      max: maxVol,
      tones: toneList,
      monthLabels: labels,
    }
  }, [sessions, weeks])

  const level = (vol: number) => {
    if (vol <= 0) return 0
    const r = vol / max
    if (r < 0.25) return 1
    if (r < 0.5) return 2
    if (r < 0.75) return 3
    return 4
  }

  const pickedDay = picked ? days.find((d) => d.key === picked) : null
  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 pt-0.5 shrink-0" aria-hidden>
          {weekdayLabels.map((l, i) => (
            <div
              key={l}
              className={cn(
                'h-3 w-3 text-[8px] leading-3 text-muted flex items-center justify-end',
                i % 2 === 1 ? 'opacity-0' : 'opacity-80'
              )}
            >
              {i % 2 === 0 ? l : ''}
            </div>
          ))}
        </div>
        <div className="overflow-x-auto no-scrollbar flex-1 min-w-0">
          <div className="inline-block min-w-full">
            <div
              className="inline-flex gap-1 justify-end w-full"
              role="img"
              aria-label={`近 ${weeks} 週訓練熱圖，${trainedDays} 日有練`}
            >
              {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1">
                  {col.map((cell, ri) =>
                    cell ? (
                      <button
                        key={cell.key}
                        type="button"
                        title={
                          cell.trained
                            ? `${cell.label} · 容量 ${Math.round(cell.vol).toLocaleString()}`
                            : `${cell.label} · 休息`
                        }
                        aria-label={
                          cell.trained
                            ? `${cell.label} 有練，容量 ${Math.round(cell.vol)}`
                            : `${cell.label} 休息`
                        }
                        onClick={() => setPicked((p) => (p === cell.key ? null : cell.key))}
                        className={cn(
                          'h-3 w-3 rounded-[3px] transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                          tones[level(cell.vol)],
                          picked === cell.key && 'ring-2 ring-accent ring-offset-1'
                        )}
                      />
                    ) : (
                      <div key={`p-${ci}-${ri}`} className="h-3 w-3 rounded-[3px] bg-transparent" />
                    )
                  )}
                </div>
              ))}
            </div>
            <div className="relative mt-1 h-3 text-[9px] text-muted" aria-hidden>
              {monthLabels.map((m) => (
                <span
                  key={`${m.col}-${m.text}`}
                  className="absolute"
                  style={{ left: `${m.col * 16}px` }}
                >
                  {m.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {pickedDay && (
        <p className="mt-2 text-[11px] text-foreground/90 leading-relaxed rounded-xl bg-accent-soft/50 border border-accent/15 px-2.5 py-2">
          {pickedDay.trained ? (
            <>
              <span className="font-medium text-accent">{pickedDay.label}</span>
              {' · '}
              容量 {Math.round(pickedDay.vol).toLocaleString()} kg×reps
            </>
          ) : (
            <>
              <span className="font-medium">{pickedDay.label}</span>
              {' · '}
              嗰日休息／未記
            </>
          )}
        </p>
      )}

      {trainedDays === 0 && (
        <p className="mb-2 mt-1 text-[11px] text-muted leading-relaxed">
          未有訓練紀錄——完場之後呢度會逐格點亮。撳格仔可以睇當日容量。
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span>
          近 {weeks} 週 · {trainedDays} 日有練
        </span>
        <span className="inline-flex items-center gap-1">
          少
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={cn('inline-block h-2.5 w-2.5 rounded-[2px]', tones[l])} />
          ))}
          多
        </span>
      </div>
    </div>
  )
}

/** Alias used by some call sites */
export const WorkoutHeatmap = TrainHeatmap
