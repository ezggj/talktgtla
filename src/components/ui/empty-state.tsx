'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
  compact = false,
  emoji,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  /** Optional second CTA (e.g. 改用模板) */
  secondaryLabel?: string
  onSecondary?: () => void
  className?: string
  compact?: boolean
  emoji?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-dashed border-border/90 bg-surface text-center shadow-soft',
        compact ? 'px-5 py-8' : 'px-6 py-11',
        className
      )}
    >
      {emoji && (
        <div
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-lg"
          aria-hidden
        >
          {emoji}
        </div>
      )}
      <h3 className="font-serif text-lg tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 mx-auto max-w-xs text-sm text-muted leading-relaxed">{description}</p>
      {(actionLabel && onAction) || (secondaryLabel && onSecondary) ? (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button size="default" className="min-w-[9.5rem] touch-manipulation" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[9.5rem] touch-manipulation"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
