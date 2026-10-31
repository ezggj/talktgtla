'use client'

import { cn } from '@/lib/utils'

const TONE_STROKE: Record<string, string> = {
  accent: 'var(--accent)',
  protein: '#0F766E',
  carbs: '#B45309',
  fat: '#7C3AED',
  kcal: '#0F766E',
  warning: 'var(--warning)',
}

export function ProgressRing({
  value,
  max = 100,
  size = 88,
  stroke = 8,
  label,
  sublabel,
  className,
  tone = 'accent',
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
  className?: string
  tone?: keyof typeof TONE_STROKE
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const color = TONE_STROKE[tone] || TONE_STROKE.accent

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {label && <div className={cn(size < 70 ? "text-[11px]" : size < 80 ? "text-xs" : "text-sm", "font-semibold tabular-nums leading-none")}>{label}</div>}
        {sublabel && <div className="text-[10px] text-muted mt-1 leading-tight">{sublabel}</div>}
      </div>
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = 'accent',
  height = 'md',
}: {
  value: number
  max?: number
  className?: string
  tone?: keyof typeof TONE_STROKE
  height?: 'sm' | 'md' | 'lg'
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100))
  const color = TONE_STROKE[tone] || TONE_STROKE.accent
  return (
    <div
      className={cn(
        'w-full rounded-full bg-[#f0efee] overflow-hidden',
        height === 'sm' && 'h-1.5',
        height === 'md' && 'h-2',
        height === 'lg' && 'h-2.5',
        className
      )}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: color,
          transition: 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  )
}

/** Stacked macro rows — Linear-quiet nutrition readout */
export function MacroBars({
  macros,
  goals,
  className,
}: {
  macros: { kcal: number; protein: number; carbs: number; fat: number }
  goals: { kcal: number; proteinG: number; carbsG?: number; fatG?: number }
  className?: string
}) {
  const carbsGoal = goals.carbsG ?? Math.round((goals.kcal * 0.45) / 4)
  const fatGoal = goals.fatG ?? Math.round((goals.kcal * 0.25) / 9)
  const rows = [
    { key: 'protein', label: '蛋白', value: macros.protein, max: goals.proteinG, unit: 'g', tone: 'protein' as const },
    { key: 'carbs', label: '碳水', value: macros.carbs, max: carbsGoal, unit: 'g', tone: 'carbs' as const },
    { key: 'fat', label: '脂肪', value: macros.fat, max: fatGoal, unit: 'g', tone: 'fat' as const },
    { key: 'kcal', label: '卡路里', value: macros.kcal, max: goals.kcal, unit: 'kcal', tone: 'kcal' as const },
  ]
  return (
    <div className={cn('space-y-3', className)}>
      {rows.map((r) => {
        const over = r.value > r.max && r.max > 0
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-medium text-muted">{r.label}</span>
              <span className={cn('text-[11px] tabular-nums', over ? 'text-warning font-medium' : 'text-foreground')}>
                <span className="font-semibold">{Math.round(r.value)}</span>
                <span className="text-muted"> / {r.max}{r.unit === 'kcal' ? '' : r.unit}</span>
              </span>
            </div>
            <ProgressBar value={r.value} max={r.max} tone={over ? 'warning' : r.tone} height="lg" />
          </div>
        )
      })}
    </div>
  )
}
