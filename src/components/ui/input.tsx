import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-2xl border border-border/90 bg-surface px-4 text-sm text-foreground placeholder:text-muted/65 outline-none transition shadow-soft focus:ring-2 focus:ring-accent/22 focus:border-accent/35 disabled:opacity-45 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-2xl border border-border/90 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/65 outline-none transition shadow-soft focus:ring-2 focus:ring-accent/22 focus:border-accent/35 disabled:opacity-45 disabled:cursor-not-allowed resize-none leading-relaxed',
        className
      )}
      {...props}
    />
  )
})
