import { cn } from '@/lib/utils'

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted/70 outline-none transition shadow-soft focus:ring-2 focus:ring-accent/25 focus:border-accent/40 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 outline-none transition shadow-soft focus:ring-2 focus:ring-accent/25 focus:border-accent/40 disabled:opacity-50 resize-none leading-relaxed',
        className
      )}
      {...props}
    />
  )
}
