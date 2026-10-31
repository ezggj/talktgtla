'use client'

import { useEffect, useState } from 'react'
import { CHAT_STARTER_CHIPS, type StarterChip } from '@/lib/chat/starter-chips'
import { getDailyTopic, topicStarterLine } from '@/lib/fitness/daily-topic'

export function StarterChipsBar({
  onPick,
}: {
  onPick: (text: string) => void
}) {
  const [topicChip, setTopicChip] = useState<StarterChip | null>(null)
  useEffect(() => {
    const topic = getDailyTopic()
    setTopicChip({
      id: `today-${topic.key}`,
      label: `${topic.emoji} 今日`,
      text: topicStarterLine(topic),
    })
  }, [])
  const chips = topicChip ? [topicChip, ...CHAT_STARTER_CHIPS] : CHAT_STARTER_CHIPS

  return (
    <div className="mb-2">
      <p className="mb-1 px-0.5 text-[10px] font-medium text-muted">今日話題／分店 · 一掣開波</p>
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
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
