'use client'

import { useState } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  drawMealShareCard,
  drawWorkoutShareCard,
  shareOrDownloadCanvas,
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

export function ShareCardButton(props: Props) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const onClick = async () => {
    setBusy(true)
    setNote(null)
    try {
      const canvas =
        props.kind === 'workout'
          ? drawWorkoutShareCard(props.payload)
          : drawMealShareCard(props.payload)
      const filename =
        props.kind === 'workout'
          ? `talktgtla-workout-${Date.now()}.png`
          : `talktgtla-meal-${Date.now()}.png`
      const title =
        props.kind === 'workout'
          ? `Talk tgt la · ${props.payload.title || '訓練'}`
          : `Talk tgt la · ${props.payload.name}`
      const result = await shareOrDownloadCanvas(canvas, filename, title)
      setNote(result === 'shared' ? '已分享' : '已下載圖片')
      window.setTimeout(() => setNote(null), 2200)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        /* user cancelled share sheet */
      } else {
        setNote('分享唔到，試多次')
        window.setTimeout(() => setNote(null), 2200)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('relative', props.className)}>
      <Button
        type="button"
        variant={props.variant ?? 'secondary'}
        size={props.size ?? 'default'}
        className="w-full"
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {props.label ?? '分享卡'}
      </Button>
      {note && (
        <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-medium text-accent shadow-soft whitespace-nowrap jump-in">{note}</p>
      )}
    </div>
  )
}
