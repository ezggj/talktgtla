'use client'

import { Dumbbell, MessageCircle, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
  /** Primary: go train */
  onStart: () => void
  onEat?: () => void
  onChat?: () => void
}

/** First-run · 3 steps · spoken Cantonese · dismissible */
export function NewbieGuide({ open, onClose, onStart, onEat, onChat }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="newbie-guide-title"
        className="welcome-card w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-hover border border-border"
      >
        <p className="text-[10px] font-semibold tracking-wide text-accent mb-2">30 秒搞掂</p>
        <h2 id="newbie-guide-title" className="font-serif text-2xl tracking-tight">
          免費記組同港式飲食
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          練完／食完一掣記。想傾先入房都得。
        </p>

        <ol className="mt-4 space-y-2.5">
          <li className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/60 px-3 py-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Dumbbell className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">① 記組</span>
              <span className="block text-[11px] text-muted leading-snug">開波 → 記重量次數 → 完場分享</span>
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/60 px-3 py-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Utensils className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">② 記餐</span>
              <span className="block text-[11px] text-muted leading-snug">港式快加／影餐估蛋白 kcal</span>
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-2xl border border-dashed border-border/80 px-3 py-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">③ 想傾先入房</span>
              <span className="block text-[11px] text-muted leading-snug">用今日話題開波，花名就得</span>
            </span>
          </li>
        </ol>

        <Button className="mt-5 w-full" size="lg" onClick={onStart}>
          去開波訓練
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {onEat ? (
            <Button variant="secondary" size="sm" className="w-full" onClick={onEat}>
              先記餐
            </Button>
          ) : (
            <span />
          )}
          {onChat ? (
            <Button variant="ghost" size="sm" className="w-full" onClick={onChat}>
              入房傾
            </Button>
          ) : (
            <span />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-1 text-xs text-muted hover:text-foreground touch-manipulation"
        >
          我識用 · 收起
        </button>
      </div>
    </div>
  )
}
