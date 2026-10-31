'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { springSnappy } from '@/components/motion/presets'

export function Card({
  className,
  hover = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  const reduce = useReducedMotion()
  const classes = cn(
    'rounded-[20px] border border-border/90 bg-surface shadow-soft p-5',
    className
  )
  if (!hover || reduce) {
    return (
      <div className={classes} {...props}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      className={classes}
      whileHover={{ scale: 1.012, boxShadow: 'var(--shadow-hover)' }}
      transition={springSnappy}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}

export function CardTitle({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h3 className={cn('font-serif text-xl tracking-tight text-foreground', className)}>
      {children}
    </h3>
  )
}

export function CardDesc({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <p className={cn('text-sm text-muted leading-relaxed', className)}>{children}</p>
}
