'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ExternalLink, Lightbulb, Play } from 'lucide-react'
import {
  GENERIC_CUES,
  resolveExerciseGuide,
  type ExerciseGuide,
} from '@/lib/exercises/library'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

function youtubeIdFromUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').slice(0, 11) || null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const m = u.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)
      if (m) return m[1]
    }
  } catch {
    /* ignore */
  }
  return null
}

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
  const [gifFailed, setGifFailed] = useState(false)
  const guide =
    resolveExerciseGuide(exerciseId) || resolveExerciseGuide(exerciseName || undefined)

  const cues = guide?.cues?.length ? guide.cues : [...GENERIC_CUES]
  const title = guide ? `${guide.nameZh} · 點做` : '點做'
  const ytId = useMemo(() => youtubeIdFromUrl(guide?.demoUrl), [guide?.demoUrl])
  const thumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null
  const gifUrl = guide?.demoGifUrl && !gifFailed ? guide.demoGifUrl : null

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border transition touch-manipulation',
          variant === 'panel'
            ? 'w-full justify-between px-3.5 py-2.5 text-sm border-border bg-[#fafaf9] hover:bg-accent-soft/50'
            : 'px-2.5 py-1 text-[11px] font-medium border-border text-accent hover:bg-accent-soft'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <Lightbulb className={cn(variant === 'panel' ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
          {open ? '收埋' : '點做／睇示範'}
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

              {/* Demo GIF / short video preview */}
              {(gifUrl || thumb) && (
                <div className="mb-3 overflow-hidden rounded-xl border border-border bg-black/[0.03]">
                  {gifUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gifUrl}
                      alt={`${guide?.nameZh || '動作'} 示範 GIF`}
                      className="w-full max-h-48 object-contain bg-[#f0efee]"
                      loading="lazy"
                      onError={() => setGifFailed(true)}
                    />
                  ) : guide?.demoUrl && thumb ? (
                    <a
                      href={guide.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={`${guide.nameZh} 教學短片預覽`}
                        className="w-full max-h-44 object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 text-accent px-3 py-1.5 text-xs font-semibold shadow-soft">
                          <Play className="h-3.5 w-3.5 fill-accent" />
                          播教學短片
                        </span>
                      </span>
                    </a>
                  ) : null}
                </div>
              )}

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
                  {gifUrl ? '再開短片教學' : '睇示範'}
                  {guide.demoLabel ? `（${guide.demoLabel}）` : ''}
                </a>
              ) : (
                <p className="mt-3 text-[10px] text-muted leading-relaxed">
                  未有示範片：核心收實、控制速度、痛就停。之後可以自己加備註。
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
        'shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft inline-flex items-center gap-1 touch-manipulation',
        className
      )}
      title="睇示範"
    >
      點做
      <ExternalLink className="h-2.5 w-2.5" />
    </motion.a>
  )
}
