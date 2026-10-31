import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  trailing,
  compact,
}: {
  eyebrow: string
  title: string
  description?: string
  className?: string
  trailing?: React.ReactNode
  /** Mobile-first: less vertical space so primary CTA fits above the fold */
  compact?: boolean
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3',
        compact ? 'mb-3' : 'mb-8',
        className
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            'font-medium uppercase tracking-[0.16em] text-muted',
            compact ? 'text-[10px] mb-1' : 'text-[11px] mb-2'
          )}
        >
          {eyebrow}
        </p>
        <h1
          className={cn(
            'font-serif tracking-tight text-foreground leading-[1.15]',
            compact
              ? 'text-[1.5rem] sm:text-[1.875rem]'
              : 'text-[1.875rem] sm:text-[2.25rem]'
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              'text-muted leading-relaxed max-w-md',
              compact ? 'mt-1 text-[12px] line-clamp-2' : 'mt-2.5 text-sm'
            )}
          >
            {description}
          </p>
        )}
      </div>
      {trailing ? <div className="shrink-0 max-w-[42%]">{trailing}</div> : null}
    </header>
  )
}
