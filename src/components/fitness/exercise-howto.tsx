'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ExternalLink, Lightbulb } from 'lucide-react'
import {
  GENERIC_CUES,
  resolveExerciseGuide,
  type ExerciseGuide,
} from '@/lib/exercises/library'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

type Props = {
  exerciseId?: string | null
  exerciseName?: string | null
  /** compact = inline chip under title; panel = full card block */
  variant?: 'inline' | 'panel'
  className?: string
  defaultOpen?: boolean
}

export function ExerciseHowTo({
  exerciseId,
  exerciseName,
  variant = 'inline',
  className,
  defaultOpen = false,
}: Props) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(defaultOpen)
  const guide =
    resolveExerciseGuide(exerciseId) || resolveExerciseGuide(exerciseName || undefined)

  const cues = guide?.cues?.length ? guide.cues : [...GENERIC_CUES]
  const title = guide ? `${guide.nameZh} · 點做` : '點做'

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border transition',
          variant === 'panel'
            ? 'w-full justify-between px-3.5 py-2.5 text-sm border-border bg-[#fafaf9] hover:bg-accent-soft/50'
            : 'px-2.5 py-1 text-[11px] font-medium border-border text-accent hover:bg-accent-soft'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <Lightbulb className={cn(variant === 'panel' ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
          {open ? '收起做法' : '點做'}
          {guide && variant === 'panel' && (
            <span className="text-muted font-normal text-xs">· {guide.nameZh}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted transition-transform',
            open && 'rotate-180',
            variant === 'inline' && 'h-3 w-3'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="howto"
            initial={reduce ? false : { opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={reduce ? undefined : { opacity: 0, height: 0, y: -4 }}
            transition={springSoft}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'mt-2 rounded-2xl border border-border bg-[#fafaf9] p-3.5',
                variant === 'inline' && 'mt-2'
              )}
            >
              <div className="text-xs font-semibold text-accent mb-2">{title}</div>
              <ul className="space-y-2">
                {cues.map((c, i) => (
                  <li key={i} className="text-xs text-foreground/90 leading-relaxed flex gap-2">
                    <span className="text-accent shrink-0 font-medium">{i + 1}.</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              {guide?.demoUrl ? (
                <a
                  href={guide.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  睇示範{guide.demoLabel ? `（${guide.demoLabel}）` : ''}
                </a>
              ) : (
                <p className="mt-3 text-[10px] text-muted leading-relaxed">
                  未有示範片：保持核心、控制速度、痛就停。之後可以自己加備註。
                </p>
              )}
              {!guide && (
                <p className="mt-2 text-[10px] text-muted">自訂動作——有示範片之後會自動對上。</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Tiny 「點做」 link used in picker rows without expanding the whole sheet. */
export function ExerciseHowToHint({
  exercise,
  className,
}: {
  exercise: ExerciseGuide
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.a
      href={exercise.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      transition={springSnappy}
      className={cn(
        'shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft inline-flex items-center gap-1',
        className
      )}
      title="睇示範"
    >
      點做
      <ExternalLink className="h-2.5 w-2.5" />
    </motion.a>
  )
}
