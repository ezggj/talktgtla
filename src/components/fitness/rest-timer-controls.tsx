'use client'

import { Pause, Play, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [60, 90, 120] as const

type Props = {
  variant: 'inline' | 'fullscreen'
  restSec: number
  restLeft: number
  restRunning: boolean
  autoStart: boolean
  canVibrate: boolean
  onPick: (sec: number) => void
  onAdjust: (delta: number) => void
  onToggleRun: () => void
  onSkip: () => void
  onToggleAuto: () => void
}

/** Shared rest controls: presets, ±15s, skip, optional auto-start. */
export function RestTimerControls({
  variant,
  restSec,
  restLeft,
  restRunning,
  autoStart,
  canVibrate,
  onPick,
  onAdjust,
  onToggleRun,
  onSkip,
  onToggleAuto,
}: Props) {
  const big = variant === 'fullscreen'
  const waiting = !restRunning && restLeft > 0
  const chip = big
    ? 'min-h-12 rounded-full px-5 text-sm font-semibold border touch-manipulation'
    : 'min-h-9 rounded-full px-2.5 py-1 text-[11px] border touch-manipulation'
  const on = big
    ? 'border-teal-300 bg-teal-400/20 text-teal-100'
    : 'border-accent bg-accent-soft text-accent'
  const off = big
    ? 'border-white/25 text-white/85'
    : 'border-border text-muted hover:text-foreground'

  return (
    <div className={big ? 'mt-8 flex w-full max-w-md flex-col items-center gap-3' : 'mt-2.5'}>
      <div className={cn('flex flex-wrap gap-1.5', big && 'justify-center')}>
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className={cn(chip, restSec === s ? on : off)}
          >
            {s}s
          </button>
        ))}
        <button type="button" onClick={() => onAdjust(-15)} className={cn(chip, off)} aria-label="減 15 秒">
          −15
        </button>
        <button type="button" onClick={() => onAdjust(15)} className={cn(chip, off)} aria-label="加 15 秒">
          +15
        </button>
      </div>
      <div className={cn('flex flex-wrap gap-2', big && 'justify-center')}>
        <button
          type="button"
          onClick={onToggleRun}
          className={cn(chip, off, 'inline-flex items-center gap-1.5')}
        >
          {restRunning ? (
            <Pause className={big ? 'h-4 w-4' : 'h-3 w-3'} />
          ) : (
            <Play className={big ? 'h-4 w-4' : 'h-3 w-3'} />
          )}
          {restRunning ? '暫停' : waiting ? '開始倒數' : '繼續'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className={cn(
            chip,
            big ? 'border-transparent bg-teal-600 text-white' : 'border-accent/30 text-accent'
          )}
        >
          跳過 · 下一組
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleAuto}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium touch-manipulation',
          big
            ? autoStart
              ? 'bg-white/15 text-teal-100'
              : 'text-white/60'
            : autoStart
              ? 'text-accent'
              : 'text-muted'
        )}
        aria-pressed={autoStart}
      >
        {autoStart ? '記完自動開倒數 · 開' : '記完自動開倒數 · 關'}
      </button>
      <p className={cn('text-[10px] leading-relaxed', big ? 'text-white/55' : 'text-muted')}>
        下次休息記住 {restSec}s
        {canVibrate ? (
          <span className="inline-flex items-center gap-1 ml-2">
            <Smartphone className="h-3 w-3" />
            倒數完會震
          </span>
        ) : null}
      </p>
    </div>
  )
}
