import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  trailing,
}: {
  eyebrow: string
  title: string
  description?: string
  className?: string
  trailing?: React.ReactNode
}) {
  return (
    <header className={cn('mb-8 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted mb-2">
          {eyebrow}
        </p>
        <h1 className="font-serif text-[1.875rem] sm:text-[2.25rem] tracking-tight text-foreground leading-[1.15]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 text-sm text-muted leading-relaxed max-w-md">{description}</p>
        )}
      </div>
      {trailing ? <div className="shrink-0 max-w-[42%]">{trailing}</div> : null}
    </header>
  )
}
