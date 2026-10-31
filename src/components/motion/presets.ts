export const springSoft = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 220,
}

export const springSnappy = {
  type: 'spring' as const,
  damping: 26,
  stiffness: 240,
}

export const pageEnter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: springSoft,
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: springSoft },
}

export const hoverLift = {
  whileHover: { scale: 1.02, transition: springSnappy },
  whileTap: { scale: 0.98, transition: springSnappy },
}
