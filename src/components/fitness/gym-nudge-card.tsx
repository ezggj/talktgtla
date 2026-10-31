'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGymNudge, type GymNudge } from '@/lib/fitness/gym-nudge'
import { cn } from '@/lib/utils'

export function GymNudgeCard({
  streak = 0,
  hasActiveSession,
  onStart,
  className,
}: {
  streak?: number
  hasActiveSession?: boolean
  onStart?: () => void
  className?: string
}) {
  const [nudge, setNudge] = useState<GymNudge>(null)

  useEffect(() => {
    setNudge(getGymNudge({ streak, hasActiveSession }))
  }, [streak, hasActiveSession])

  if (!nudge) return null

  const toneBg =
    nudge.tone === 'warm'
      ? 'bg-[#FEF3C7]/55'
      : nudge.tone === 'calm'
        ? 'bg-surface-muted'
        : 'bg-accent-soft/70'

  return (
    <Card className={cn('py-4 overflow-hidden', className)}>
      <div className="flex gap-3 items-start">
        <div
          className={cn('h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center', toneBg)}
        >
          <Dumbbell className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{nudge.title}</div>
          <p className="text-[12px] text-muted leading-relaxed mt-0.5">{nudge.body}</p>
          <div className="mt-3">
            {onStart ? (
              <Button size="sm" onClick={onStart}>
                {nudge.cta}
              </Button>
            ) : (
              <Link
                href="/train"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-3.5 text-xs font-semibold text-white shadow-soft hover:bg-[#0d6a63] transition-colors"
              >
                {nudge.cta}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
