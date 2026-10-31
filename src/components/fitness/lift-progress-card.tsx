'use client'

import { useMemo, useState } from 'react'
import { Card, CardTitle } from '@/components/ui/card'
import {
  buildLiftTrends,
  deltaLabel,
  formatTopSet,
  formatVolume,
  pointValue,
  type LiftMetric,
  type LiftPoint,
  type LiftTrend,
} from '@/lib/fitness/lift-trends'
import type { WorkoutSession } from '@/lib/fitness/storage'
import { cn } from '@/lib/utils'

const W = 320
const H = 92
const PAD_L = 6
const PAD_R = 6
const PAD_T = 10
const PAD_B = 18

function chartCoords(points: LiftPoint[], metric: LiftMetric) {
  const values = points.map((p) => pointValue(p, metric))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const pad = span > 0 ? span * 0.14 : Math.max(Math.abs(max) * 0.08, 1)
  const yMin = min - pad
  const yMax = max + pad
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const x = (i: number) =>
    points.length === 1 ? PAD_L + plotW / 2 : PAD_L + (i / (points.length - 1)) * plotW
  const y = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * plotH
  return { values, x, y }
}

function LiftLine({ points, metric, label }: { points: LiftPoint[]; metric: LiftMetric; label: string }) {
  const { values, x, y } = chartCoords(points, metric)
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(pointValue(p, metric)).toFixed(1)}`).join(' ')
  const area = `${PAD_L},${H - PAD_B} ${line} ${x(points.length - 1).toFixed(1)},${H - PAD_B}`
  const last = points[points.length - 1]
  const first = points[0]
  const aria =
    metric === 'weight'
      ? `${label}走勢，最近 ${formatTopSet(last)}`
      : `${label}容量走勢，最近 ${formatVolume(last.volume)}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-1.5 w-full h-auto"
      role="img"
      aria-label={aria}
    >
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="var(--border)"
        strokeWidth="1"
      />
      <polygon points={area} fill="var(--accent)" opacity="0.16" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => {
        const cx = x(i)
        const cy = y(values[i])
        const isLast = i === points.length - 1
        return (
          <g key={`${p.at}-${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r={isLast ? 3.6 : 2.6}
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="1.75"
            >
              <title>
                {p.dateLabel} · {formatTopSet(p)} · 容量 {formatVolume(p.volume)}
              </title>
            </circle>
          </g>
        )
      })}
      <text x={x(0)} y={H - 4} fill="var(--muted)" fontSize="10" textAnchor="start">
        {first.dateLabel}
      </text>
      {points.length > 2 && (
        <text
          x={x(Math.floor((points.length - 1) / 2))}
          y={H - 4}
          fill="var(--muted)"
          fontSize="10"
          textAnchor="middle"
        >
          {points[Math.floor((points.length - 1) / 2)].dateLabel}
        </text>
      )}
      <text x={x(points.length - 1)} y={H - 4} fill="var(--muted)" fontSize="10" textAnchor="end">
        {last.dateLabel}
      </text>
    </svg>
  )
}

function LiftRow({ trend, metric }: { trend: LiftTrend; metric: LiftMetric }) {
  const last = trend.points[trend.points.length - 1]
  const delta = deltaLabel(trend.points, metric)
  const hasCurve = trend.points.length >= 2
  return (
    <div className="rounded-2xl border border-border bg-surface-muted px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{trend.label}</span>
        {last ? (
          <span className="text-[12px] font-semibold tabular-nums text-accent">
            {metric === 'weight' ? formatTopSet(last) : `容量 ${formatVolume(last.volume)}`}
          </span>
        ) : null}
      </div>
      {last && metric === 'volume' ? (
        <p className="text-[10px] text-muted tabular-nums">最重 {formatTopSet(last)}</p>
      ) : null}
      {hasCurve ? (
        <>
          <LiftLine points={trend.points} metric={metric} label={trend.label} />
          {delta ? <p className="text-[10px] text-muted">{delta}</p> : null}
        </>
      ) : (
        <p className="mt-1 text-[12px] text-muted">練多幾次就會出曲線。</p>
      )}
    </div>
  )
}

export function LiftProgressCard({ sessions }: { sessions: WorkoutSession[] }) {
  const trends = useMemo(() => buildLiftTrends(sessions), [sessions])
  const [metric, setMetric] = useState<LiftMetric>('weight')
  const ready = trends.filter((t) => t.points.length >= 2)
  const waiting = trends.filter((t) => t.points.length < 2)
  const singles = waiting.filter((t) => t.points.length === 1)

  return (
    <Card className="py-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <CardTitle className="text-lg">主項走勢</CardTitle>
        {ready.length > 0 && (
          <div className="flex rounded-full border border-border bg-surface-muted p-0.5">
            {(
              [
                { id: 'weight' as const, label: '重量' },
                { id: 'volume' as const, label: '容量' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={metric === opt.id}
                onClick={() => setMetric(opt.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                  metric === opt.id ? 'bg-accent-soft text-accent font-semibold' : 'text-muted'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mb-3 text-[11px] text-muted leading-relaxed">
        深蹲、卧推、硬拉、RDL、肩推、划船。每點係嗰場最重嗰組。
      </p>

      {ready.length === 0 ? (
        <div>
          {singles.length > 0 && (
            <ul className="mb-2 space-y-1">
              {singles.map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="font-medium">{t.label}</span>
                  <span className="tabular-nums text-accent">{formatTopSet(t.points[0])}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">練多幾次就會出曲線。</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ready.map((t) => (
            <LiftRow key={t.id} trend={t} metric={metric} />
          ))}
          {waiting.length > 0 && (
            <p className="px-0.5 text-[11px] text-muted leading-relaxed">
              {waiting.map((t) => t.label).join('、')}：練多幾次就會出曲線。
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
