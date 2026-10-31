'use client'

import { useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  copyText,
  drawMealShareCard,
  drawWorkoutShareCard,
  mealShareCaption,
  shareForInstagram,
  shareOrDownloadCanvas,
  threadsIntentUrl,
  workoutShareCaption,
  type MealSharePayload,
  type WorkoutSharePayload,
} from '@/lib/fitness/share-card'
import { cn } from '@/lib/utils'

type Props =
  | {
      kind: 'workout'
      payload: WorkoutSharePayload
      className?: string
      variant?: 'default' | 'secondary' | 'soft' | 'ghost'
      size?: 'sm' | 'default' | 'lg' | 'xl'
      label?: string
    }
  | {
      kind: 'meal'
      payload: MealSharePayload
      className?: string
      variant?: 'default' | 'secondary' | 'soft' | 'ghost'
      size?: 'sm' | 'default' | 'lg' | 'xl'
      label?: string
    }

function buildCanvas(props: Props) {
  return props.kind === 'workout'
    ? drawWorkoutShareCard(props.payload)
    : drawMealShareCard(props.payload)
}

function buildCaption(props: Props) {
  return props.kind === 'workout'
    ? workoutShareCaption(props.payload)
    : mealShareCaption(props.payload)
}

function buildMeta(props: Props) {
  const filename =
    props.kind === 'workout'
      ? `talktgtla-workout-${Date.now()}.png`
      : `talktgtla-meal-${Date.now()}.png`
  const title =
    props.kind === 'workout'
      ? `Talk tgt la · ${props.payload.title || '訓練'}`
      : `Talk tgt la · ${props.payload.name}`
  return { filename, title }
}

export function ShareCardButton(props: Props) {
  const [busy, setBusy] = useState<'threads' | 'ig' | 'share' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const flash = (msg: string) => {
    setNote(msg)
    window.setTimeout(() => setNote(null), 2800)
  }

  const onThreads = async () => {
    setBusy('threads')
    try {
      const caption = buildCaption(props)
      // 先出圖（下載／分享），再開 Threads 貼文 intent
      const canvas = buildCanvas(props)
      const { filename, title } = buildMeta(props)
      await shareOrDownloadCanvas(canvas, filename, title, caption)
      window.open(threadsIntentUrl(caption), '_blank', 'noopener,noreferrer')
      flash('已開 Threads · 文案已備好，貼埋圖就得')
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        flash('分享唔到，試多次')
      }
    } finally {
      setBusy(null)
    }
  }

  const onIg = async () => {
    setBusy('ig')
    try {
      const caption = buildCaption(props)
      const canvas = buildCanvas(props)
      const { filename, title } = buildMeta(props)
      const result = await shareForInstagram(canvas, filename, caption, title)
      flash(
        result === 'shared'
          ? '文案已複製 · 開 IG Story 貼圖'
          : '圖已下載、文案已複製 · 開 IG Story 貼圖'
      )
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        flash('分享唔到，試多次')
      }
    } finally {
      setBusy(null)
    }
  }

  const onGeneric = async () => {
    setBusy('share')
    try {
      const caption = buildCaption(props)
      const canvas = buildCanvas(props)
      const { filename, title } = buildMeta(props)
      const result = await shareOrDownloadCanvas(canvas, filename, title, caption)
      flash(result === 'shared' ? '已分享' : '已下載圖片')
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        flash('分享唔到，試多次')
      }
    } finally {
      setBusy(null)
    }
  }

  const onCopyCaption = async () => {
    const ok = await copyText(buildCaption(props))
    flash(ok ? '文案已複製' : '複製唔到，試多次')
  }

  return (
    <div className={cn('relative space-y-2', props.className)}>
      <Button
        type="button"
        variant={props.variant ?? 'secondary'}
        size={props.size ?? 'default'}
        className="w-full"
        disabled={busy !== null}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {props.label ?? '分享卡'}
      </Button>

      {open && (
        <div className="rounded-2xl border border-border bg-surface p-2.5 shadow-soft space-y-1.5 ">
          <p className="px-1 text-[11px] text-muted leading-relaxed">
            出圖之後揀平台——Threads 開貼文、IG 貼 Story。
          </p>
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="w-full justify-start"
            disabled={busy !== null}
            onClick={() => void onThreads()}
          >
            {busy === 'threads' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="text-sm leading-none" aria-hidden>
                ✺
              </span>
            )}
            分享去 Threads
          </Button>
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="w-full justify-start"
            disabled={busy !== null}
            onClick={() => void onIg()}
          >
            {busy === 'ig' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            分享去 IG
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            disabled={busy !== null}
            onClick={() => void onGeneric()}
          >
            {busy === 'share' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            出圖／系統分享
          </Button>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left text-[11px] text-muted hover:text-foreground touch-manipulation"
            onClick={() => void onCopyCaption()}
          >
            淨係複製文案
          </button>
        </div>
      )}

      {note && (
        <p className="text-center rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-accent shadow-soft ">
          {note}
        </p>
      )}
    </div>
  )
}
