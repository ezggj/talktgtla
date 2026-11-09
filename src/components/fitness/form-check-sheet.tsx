'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Video, X } from 'lucide-react'
import { springSoft } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import {
  angleSlots,
  anglesFor,
  formCheckKind,
  formCheckSummary,
  readFrame,
  type AngleTone,
  type FormCheckKind,
  type FormFrame,
} from '@/lib/fitness/form-check'
import { openPoseEngine, type PoseEngine } from '@/lib/fitness/pose-session'
import { cn } from '@/lib/utils'

const TONE_LABEL: Record<AngleTone, string> = {
  green: '綠',
  yellow: '黃',
  red: '紅',
}

const TONE_TEXT: Record<AngleTone, string> = {
  green: 'text-emerald-700 dark:text-emerald-300',
  yellow: 'text-amber-700 dark:text-amber-300',
  red: 'text-red-700 dark:text-red-300',
}

const TONE_BADGE: Record<AngleTone, string> = {
  green: 'bg-emerald-600 text-white',
  yellow: 'bg-amber-500 text-white',
  red: 'bg-red-600 text-white',
}

type Phase = 'choose' | 'loading' | 'live' | 'ready' | 'error'
type Source = 'camera' | 'file'

type EntryProps = {
  exerciseId: string | null
  exerciseName: string
  saved?: boolean
  onUse: (summary: string) => void
}

type SheetProps = {
  open: boolean
  kind: FormCheckKind
  exerciseId: string
  exerciseName: string
  onClose: () => void
  onUse: (summary: string) => void
}

function cameraError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false
  return err.name === 'NotAllowedError' || err.name === 'NotFoundError' || err.name === 'NotReadableError' || err.name === 'SecurityError'
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function FormCheckEntry({ exerciseId, exerciseName, saved = false, onUse }: EntryProps) {
  const kind = formCheckKind(exerciseId)
  const client = useIsClient()
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = Boolean(exerciseId && openFor === exerciseId && kind)
  if (!kind || !exerciseId || !client) return null
  return createPortal(
    <>
      <div className="form-check-entry">
        <button
          type="button"
          data-testid="form-check-open-sticky"
          onClick={() => setOpenFor(exerciseId)}
          className="pointer-events-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-accent/30 bg-surface/95 px-4 py-2 text-sm font-semibold text-accent shadow-hover backdrop-blur-md touch-manipulation"
        >
          <Video className="h-4 w-4" />
          {saved ? '再睇姿勢' : '睇吓姿勢'}
        </button>
      </div>
      <FormCheckSheet
        open={open}
        kind={kind}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        onClose={() => setOpenFor(null)}
        onUse={(summary) => {
          onUse(summary)
          setOpenFor(null)
        }}
      />
    </>,
    document.body
  )
}

function FormCheckSheet({ open, kind, exerciseId, exerciseName, onClose, onUse }: SheetProps) {
  const reduce = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const urlRef = useRef<string | null>(null)
  const engineRef = useRef<PoseEngine | null>(null)
  const runRef = useRef(0)
  const sourceRef = useRef<Source | null>(null)
  const openRef = useRef(open)
  const quietRef = useRef(false)
  const depthRef = useRef<number | null>(null)
  const snapRef = useRef<HTMLCanvasElement>(null)
  const stopRef = useRef<() => void>(() => {})

  const [phase, setPhase] = useState<Phase>('choose')
  const [error, setError] = useState<string | null>(null)
  const [latch, setLatch] = useState<FormFrame | null>(null)
  const [mirror, setMirror] = useState(false)
  const [snapOn, setSnapOn] = useState(false)
  const [seenOpen, setSeenOpen] = useState(open)

  if (open !== seenOpen) {
    setSeenOpen(open)
    if (open) {
      setPhase('choose')
      setError(null)
      setLatch(null)
      setMirror(false)
      setSnapOn(false)
    }
  }

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    stopRef.current = () => {
      const video = videoRef.current
      if (video) {
        video.pause()
        video.srcObject = null
        video.removeAttribute('src')
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      engineRef.current?.close()
      engineRef.current = null
    }
  })

  useEffect(() => {
    return () => {
      runRef.current += 1
      stopRef.current()
    }
  }, [])

  useEffect(() => {
    if (open) {
      sourceRef.current = null
      quietRef.current = false
      depthRef.current = null
      return
    }
    runRef.current += 1
    stopRef.current()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      runRef.current += 1
      stopRef.current()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || phase !== 'live') return
    const video = videoRef.current
    const engine = engineRef.current
    if (!video || !engine) return
    let stopped = false
    let raf = 0
    let busy = false
    let last = 0
    const started = performance.now()

    const tick = () => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      if (busy) return
      if (video.ended) {
        setPhase('ready')
        return
      }
      if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
      const now = performance.now()
      if (sourceRef.current === 'file' && now - started > 20_000) {
        video.pause()
        setPhase('ready')
        return
      }
      if (now - last < 120) return
      last = now
      busy = true
      void engine
        .detect(video, now)
        .then((landmarks) => {
          if (stopped || !landmarks) return
          const next = readFrame(landmarks)
          if (!next) return
          const depth = kind === 'squat' ? next.knee : next.hip
          if (depthRef.current != null && depth >= depthRef.current) return
          depthRef.current = depth
          const canvas = snapRef.current
          if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              setSnapOn(true)
            }
          }
          setLatch(next)
        })
        .catch(() => {
          if (stopped || quietRef.current) return
          video.pause()
          streamRef.current?.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          setError('計角度嗰陣出錯。可以跳過，照記組。')
          setPhase('error')
        })
        .finally(() => {
          busy = false
        })
    }

    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [open, phase, kind])

  const close = () => {
    runRef.current += 1
    stopRef.current()
    onClose()
  }

  const start = async (nextSource: Source, file?: File) => {
    const token = ++runRef.current
    const alive = () => token === runRef.current && openRef.current
    stopRef.current()
    setLatch(null)
    setError(null)
    setMirror(false)
    setSnapOn(false)
    depthRef.current = null
    sourceRef.current = nextSource
    setPhase('loading')
    try {
      const video = videoRef.current
      if (!video) throw new Error('no-video')
      if (nextSource === 'camera') {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException('no camera', 'NotFoundError')
        }
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          })
        } catch (err) {
          if (cameraError(err) && err instanceof DOMException && err.name === 'NotAllowedError') throw err
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        }
        if (!alive()) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const facing = stream.getVideoTracks()[0]?.getSettings?.().facingMode
        setMirror(facing === 'user')
        video.srcObject = stream
      } else if (file) {
        const url = URL.createObjectURL(file)
        urlRef.current = url
        video.src = url
      } else {
        throw new Error('no-file')
      }
      video.muted = true
      video.playsInline = true
      await video.play()
      if (!alive()) return
      const engine = await openPoseEngine()
      if (!alive()) {
        engine.close()
        return
      }
      engineRef.current = engine
      setPhase('live')
    } catch (err) {
      if (!alive()) return
      stopRef.current()
      if (nextSource === 'camera' && cameraError(err)) {
        setError('鏡頭開唔到。可以改揀段片，或者而家跳過。')
      } else if (nextSource === 'file' && err instanceof DOMException) {
        setError('段片播唔到。可以開鏡頭，或者而家跳過。')
      } else {
        setError('而家開唔到。可以跳過，照記組。')
      }
      setPhase('error')
    }
  }

  const freeze = () => {
    videoRef.current?.pause()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setPhase('ready')
  }

  const useReading = () => {
    if (!latch) return
    quietRef.current = true
    runRef.current += 1
    stopRef.current()
    const name = exerciseName.trim() || (kind === 'squat' ? '深蹲' : '硬拉')
    onUse(formCheckSummary(name, anglesFor(kind, latch)))
  }

  const readings = latch ? anglesFor(kind, latch) : null
  const slots = angleSlots(kind)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            data-testid="form-check-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-check-title"
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[24px] border border-border bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-hover sm:rounded-[20px]"
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 16, opacity: 0 }}
            transition={springSoft}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-accent">可選。唔睇都記到組。</p>
                <h2 id="form-check-title" className="font-serif text-2xl tracking-tight">
                  睇吓姿勢
                </h2>
                <p className="text-[12px] text-muted">{exerciseName}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="關閉"
                className="rounded-full border border-border p-2 text-muted touch-manipulation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              側面影清楚啲。正面同斜後方會睇少咗膝彎。
            </p>
            <p className="text-[12px] leading-relaxed text-foreground">畫面只喺你部機處理，唔會上傳片。</p>
            {exerciseId === 'sumo-deadlift' && (
              <p className="text-[12px] leading-relaxed text-muted">相撲膝會彎多啲，當參考就得。</p>
            )}

            <div className="relative mt-3 aspect-[4/3] max-h-48 overflow-hidden rounded-2xl bg-[#121716]">
              <video
                ref={videoRef}
                className={cn(
                  'h-full w-full object-contain',
                  mirror && !snapOn && '-scale-x-100',
                  phase === 'choose' || phase === 'error' || snapOn ? 'opacity-0' : 'opacity-100'
                )}
                playsInline
                muted
                onEnded={() => {
                  if (sourceRef.current === 'file') setPhase('ready')
                }}
              />
              <canvas
                ref={snapRef}
                className={cn(
                  'absolute inset-0 h-full w-full object-contain',
                  snapOn ? 'opacity-100' : 'opacity-0'
                )}
              />
              {phase === 'choose' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                  <Button type="button" className="w-full max-w-xs" onClick={() => void start('camera')}>
                    開鏡頭
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full max-w-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    揀段片
                  </Button>
                </div>
              )}
              {phase === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-4 text-center text-sm text-white">
                  準備緊…
                </div>
              )}
              {phase === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white">
                  {error}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void start('file', file)
              }}
            />

            <p className="mt-2 text-[11px] text-muted">
              {latch ? '留低最深嗰下。' : phase === 'live' || phase === 'ready' ? '未見到清晰側面。頭到腳入鏡再試。' : '頭到腳入鏡，側面最好睇。'}
            </p>

            <ul className="mt-2 space-y-1.5">
              {slots.map((slot) => {
                const angle = readings?.find((item) => item.id === slot.id)
                return (
                  <li
                    key={slot.id}
                    data-testid={`form-check-angle-${slot.id}`}
                    data-tone={angle?.tone ?? 'none'}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{slot.label}</div>
                      <div className="text-[12px] leading-snug text-muted">{angle?.note ?? '等側面入鏡'}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={cn(
                          'text-2xl font-semibold tabular-nums leading-none',
                          angle ? TONE_TEXT[angle.tone] : 'text-muted'
                        )}
                      >
                        {angle ? `${Math.round(angle.degrees)}°` : '—'}
                      </div>
                      {angle && (
                        <div className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold', TONE_BADGE[angle.tone])}>
                          {TONE_LABEL[angle.tone]}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {phase === 'live' && (
              <button
                type="button"
                onClick={freeze}
                className="mt-2 w-full min-h-10 text-[13px] font-semibold text-accent touch-manipulation"
              >
                睇完，停喺呢度
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={close}>
                而家跳過
              </Button>
              <Button type="button" data-testid="form-check-use" disabled={!latch} onClick={useReading}>
                用呢個
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">參考吓姿勢，唔係醫療意見。痛就停。</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
