import { cn } from '@/lib/utils'

export function Badge({
  className,
  tone = 'default',
  children,
}: {
  className?: string
  tone?: 'default' | 'accent' | 'warning' | 'muted'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        tone === 'default' && 'bg-[#f5f5f4] text-foreground',
        tone === 'accent' && 'bg-accent-soft text-accent',
        tone === 'warning' && 'bg-amber-50 text-warning',
        tone === 'muted' && 'bg-transparent text-muted border border-border',
        className
      )}
    >
      {children}
    </span>
  )
}
