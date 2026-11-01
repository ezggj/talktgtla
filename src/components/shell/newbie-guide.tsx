'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
  onStart: () => void
}

/** One screen, one primary action. Spoken Cantonese. */
export function NewbieGuide({ open, onClose, onStart }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="newbie-guide-title"
        className="welcome-card w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-hover border border-border"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h2 id="newbie-guide-title" className="font-serif text-2xl tracking-tight">
          入嚟傾兩句
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          寫個花名就可以講。唔知講咩，用今日話題開波。
        </p>
        <Button className="mt-5 w-full" size="lg" onClick={onStart}>
          用今日話題開波
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-1 text-xs text-muted hover:text-foreground touch-manipulation"
        >
          我識用
        </button>
      </div>
    </div>
  )
}
