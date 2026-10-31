'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
  emoji,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  compact?: boolean
  emoji?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-border/80 bg-surface text-center shadow-soft',
        compact ? 'px-5 py-8' : 'px-6 py-12',
        className
      )}
    >
      {emoji && (
        <div
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-lg"
          aria-hidden
        >
          {emoji}
        </div>
      )}
      <h3 className="font-serif text-lg tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 mx-auto max-w-xs text-sm text-muted leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
