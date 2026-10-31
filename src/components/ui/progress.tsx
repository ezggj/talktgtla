'use client'

import { cn } from '@/lib/utils'

export function ProgressRing({
  value,
  max = 100,
  size = 88,
  stroke = 8,
  label,
  sublabel,
  className,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {label && <div className="text-sm font-semibold tabular-nums leading-none">{label}</div>}
        {sublabel && <div className="text-[10px] text-muted mt-1 leading-tight">{sublabel}</div>}
      </div>
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number
  max?: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100))
  return (
    <div className={cn('h-2 w-full rounded-full bg-[#f0efee] overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-accent"
        style={{
          width: `${pct}%`,
          transition: 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  )
}
