/** Soft spring — page enter / layout pills (Linear-quiet) */
export const springSoft = {
  type: 'spring' as const,
  damping: 34,
  stiffness: 260,
  mass: 0.85,
}

export const springSnappy = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 380,
}

export const pageEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: springSoft,
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: springSoft },
}

export const hoverLift = {
  whileHover: { scale: 1.015, transition: springSnappy },
  whileTap: { scale: 0.985, transition: springSnappy },
}

export const tabPanel = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}
