'use client'

import { useEffect } from 'react'
import { Cloud } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { springSoft } from '@/components/motion/presets'

type Props = {
  message: string | null
  /** Override heading; empty/undefined auto-picks 返咗線 or default */
  title?: string
  onDismiss?: () => void
  /** Auto-hide after ms; 0 = stay until cleared */
  durationMs?: number
}

/** Floating banner when local workouts/meals upload after login / back online. */
export function SyncToast({
  message,
  title,
  onDismiss,
  durationMs = 5200,
}: Props) {
  const heading =
    title ||
    (message?.startsWith('返咗線') ? '返咗線 · 已同步' : '已同步去你個帳戶')
  useEffect(() => {
    if (!message || !onDismiss || durationMs <= 0) return
    const id = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(id)
  }, [message, onDismiss, durationMs])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed above-nav-gap left-1/2 z-[60] -translate-x-1/2 max-w-[min(92vw,420px)] rounded-2xl border border-accent/30 bg-accent text-white px-4 py-3 text-xs shadow-hover flex items-start gap-2.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={springSoft}
          role="status"
          aria-live="polite"
        >
          <Cloud className="h-4 w-4 shrink-0 mt-0.5 opacity-90" aria-hidden />
          <div className="leading-relaxed">
            <div className="font-semibold text-[13px]">{heading}</div>
            <div className="opacity-90 mt-0.5">{message}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
