'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { pageEnter, springSoft } from './presets'

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial={pageEnter.initial}
      animate={pageEnter.animate}
      transition={springSoft}
    >
      {children}
    </motion.div>
  )
}
