/** Soft spring — page enter / layout pills (Linear-quiet) */
export const springSoft = {
  type: 'spring' as const,
  damping: 32,
  stiffness: 280,
}

/** Snappy spring — taps / chip presses */
export const springSnappy = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 380,
}

export const pageEnter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: springSoft,
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: springSoft },
}

export const hoverLift = {
  whileHover: { scale: 1.015, transition: springSnappy },
  whileTap: { scale: 0.985, transition: springSnappy },
}

export const tabPanel = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}
