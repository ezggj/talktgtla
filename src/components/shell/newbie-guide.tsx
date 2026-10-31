'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dumbbell, MessageCircle, Utensils, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    id: 'chat',
    icon: MessageCircle,
    title: '傾偈',
    body: '首頁係香港人傾偈室。入個花名就可以講嘢；唔知開波講咩，撳「今日話題」就得。',
    href: '/',
    cta: '留喺傾偈',
  },
  {
    id: 'train',
    icon: Dumbbell,
    title: '訓練',
    body: '記組、休息倒數完自動跳下一組、動作有短片／GIF、日曆熱圖睇練幾密。下面 tabs 撳「訓練」就入。',
    href: '/train',
    cta: '去訓練睇下',
  },
  {
    id: 'eat',
    icon: Utensils,
    title: '飲食',
    body: '影餐或者打字，估卡路里同蛋白。登入之後訓練／飲食會自動上雲，換機都睇到。',
    href: '/eat',
    cta: '去飲食睇下',
  },
] as const

type Props = {
  open: boolean
  onClose: () => void
}

export function NewbieGuide({ open, onClose }: Props) {
  const [step, setStep] = useState(0)
  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="newbie-guide-title"
        className="welcome-card w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-hover border border-border relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 inline-flex items-center justify-center rounded-xl text-muted hover:bg-black/[0.04] hover:text-foreground transition"
          aria-label="關閉引導"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-medium text-accent tracking-wide mb-1">
          新手 · {step + 1}／{STEPS.length}
        </p>
        <h2 id="newbie-guide-title" className="font-serif text-2xl tracking-tight mb-4 pr-8">
          Talk tgt la
        </h2>

        <div className="flex gap-1.5 mb-5" aria-hidden>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface-muted px-4 py-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-foreground">{current.title}</div>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{current.body}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isLast ? (
            <>
              <Link
                href={current.href}
                onClick={onClose}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-accent px-6 text-[15px] font-medium text-white shadow-soft hover:bg-[#0d6a63] transition-colors"
              >
                {current.cta}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Button variant="secondary" className="w-full" onClick={onClose}>
                明白喇，開始用
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" size="lg" onClick={() => setStep((s) => s + 1)}>
                下一步 · {STEPS[step + 1].title}
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Link
                  href={current.href}
                  onClick={onClose}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-xs font-medium shadow-soft hover:bg-[#f5f5f4] transition-colors"
                >
                  {current.cta}
                </Link>
                <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
                  跳過
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
