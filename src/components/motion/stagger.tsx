'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { springSoft, staggerContainer, staggerItem } from './presets'

export function Stagger({
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
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
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
    <motion.div className={className} variants={staggerItem} transition={springSoft}>
      {children}
    </motion.div>
  )
}
