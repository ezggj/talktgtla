'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { springSnappy } from '@/components/motion/presets'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-[#0d6a63] dark:hover:bg-[#14b8a6] shadow-soft',
        secondary: 'bg-surface text-foreground border border-border hover:bg-surface-muted shadow-soft',
        ghost: 'bg-transparent text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground',
        danger: 'bg-danger text-white hover:bg-[#991b1b]',
        soft: 'bg-accent-soft text-accent hover:bg-[#b7f0e6] dark:hover:bg-[#0f766e]/55',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3.5 text-xs rounded-xl',
        lg: 'h-12 px-6 text-[15px] rounded-[18px]',
        icon: 'h-11 w-11',
        xl: 'h-14 px-6 text-base rounded-[20px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asMotion?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asMotion = true, children, ...props }, ref) => {
    const reduce = useReducedMotion()
    const classes = cn(buttonVariants({ variant, size }), className)
    if (!asMotion || reduce) {
      return (
        <button ref={ref} className={classes} {...props}>
          {children}
        </button>
      )
    }
    return (
      <motion.button
        ref={ref}
        className={classes}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.975 }}
        transition={springSnappy}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'
