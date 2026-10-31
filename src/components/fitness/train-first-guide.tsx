'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Dumbbell, Timer, Trophy, X } from 'lucide-react'
import { springSoft } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'

const KEY = 'talktgtla-train-first-guide-v1'

export function shouldShowTrainFirstGuide(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(KEY) !== '1'
  } catch {
    return false
  }
}

export function markTrainFirstGuideDone() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

const STEPS = [
  {
    icon: Dumbbell,
    title: '揀動作 → 記重量次數',
    body: '撳「揀動作」或者課表開波。大掣「記低」就入帳——拇指夠得到就得。',
  },
  {
    icon: Timer,
    title: '組間休息會放大',
    body: '記完自動倒數。想全螢幕大字就撳「放大」；完咗會 buzz／通知你下一組。',
  },
  {
    icon: Trophy,
    title: '失敗組都記低',
    body: '半組／失敗組可以標——之後進步提示會識計。破 PR 有掣一鍵挑戰。',
  },
] as const

export function TrainFirstGuide({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!open) return
    setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (step >= STEPS.length - 1) return
    const id = window.setTimeout(() => setStep((s) => s + 1), 10000)
    return () => window.clearTimeout(id)
  }, [open, step])

  const close = () => {
    markTrainFirstGuideDone()
    onClose()
  }

  const cur = STEPS[step]
  const Icon = cur.icon

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-label="第一次開波導覽"
            className="w-full max-w-sm rounded-[22px] border border-border bg-surface p-5 shadow-hover"
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 16, opacity: 0 }}
            transition={springSoft}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] font-semibold text-accent tracking-wide">
                  第一次開波 · {step + 1}／{STEPS.length} · 約 30 秒
                </p>
                <h2 className="font-serif text-xl tracking-tight mt-1">{cur.title}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-xl p-2 text-muted hover:text-foreground touch-manipulation"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4 mb-4 flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted leading-relaxed">{cur.body}</p>
            </div>
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <>
                  <Button variant="secondary" className="flex-1" onClick={close}>
                    跳過
                  </Button>
                  <Button className="flex-[1.4]" onClick={() => setStep((s) => s + 1)}>
                    下一步
                  </Button>
                </>
              ) : (
                <Button className="w-full" size="lg" onClick={close}>
                  明白 · 開波記組
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
