'use client'

import { CHAT_STARTER_CHIPS } from '@/lib/chat/starter-chips'

export function StarterChipsBar({
  onPick,
}: {
  onPick: (text: string) => void
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-0.5 text-[10px] font-medium text-muted">主題／分店 · 一掣開波</p>
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHAT_STARTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onPick(chip.text)}
            className="shrink-0 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-foreground hover:bg-accent-soft hover:border-accent/40 hover:text-accent active:scale-95 transition-all touch-manipulation"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
