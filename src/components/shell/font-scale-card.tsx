'use client'

import { useEffect, useState } from 'react'
import { Type } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { applyFontScale, loadFontScale, type FontScale } from '@/lib/a11y/font-scale'
import { cn } from '@/lib/utils'

const OPTIONS: { id: FontScale; label: string; hint: string }[] = [
  { id: 'sm', label: '細', hint: '多啲內容' },
  { id: 'md', label: '標準', hint: '預設' },
  { id: 'lg', label: '大', hint: '會所易睇' },
]

export function FontScaleCard() {
  const [scale, setScale] = useState<FontScale>('md')
  useEffect(() => {
    setScale(loadFontScale())
  }, [])

  return (
    <Card className="py-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Type className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-lg">字體大細</CardTitle>
          <CardDesc className="mt-0.5">三檔調校——會所燈光暗都睇得清。全站跟住變。</CardDesc>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setScale(o.id)
              applyFontScale(o.id)
            }}
            className={cn(
              'rounded-2xl border px-2 py-3 text-center touch-manipulation transition',
              scale === o.id
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border bg-surface-muted text-muted hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'font-semibold',
                o.id === 'sm' && 'text-sm',
                o.id === 'md' && 'text-base',
                o.id === 'lg' && 'text-lg'
              )}
            >
              {o.label}
            </div>
            <div className="text-[10px] mt-0.5 opacity-80">{o.hint}</div>
          </button>
        ))}
      </div>
    </Card>
  )
}
