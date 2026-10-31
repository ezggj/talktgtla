'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { loadTrainSfxEnabled, saveTrainSfxEnabled, sfxLogSet } from '@/lib/fitness/train-sfx'
import { cn } from '@/lib/utils'

export function SoundToggleCard() {
  const [on, setOn] = useState(true)

  useEffect(() => {
    setOn(loadTrainSfxEnabled())
  }, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    saveTrainSfxEnabled(next)
    if (next) sfxLogSet()
  }

  return (
    <Card className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-lg">訓練音效</CardTitle>
          <CardDesc className="mt-1">
            記組／休息完嘅輕微提示音。會所戴耳筒先開都得。
          </CardDesc>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold touch-manipulation',
            on
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border text-muted'
          )}
          aria-pressed={on}
        >
          {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {on ? '開' : '關'}
        </button>
      </div>
    </Card>
  )
}
