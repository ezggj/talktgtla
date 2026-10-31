'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import {
  ACCENT_OPTIONS,
  readAccent,
  readThemePreference,
  setAccent,
  setThemePreference,
  type AccentId,
  type ThemePreference,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

const MODE_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: '跟系統', icon: Monitor },
  { id: 'light', label: '淺色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
]

/** 「主題色」＋「跟系統／淺色／深色」 */
export function ThemeToggleCard() {
  const [pref, setPref] = useState<ThemePreference>('system')
  const [accent, setAccentState] = useState<AccentId>('teal')

  useEffect(() => {
    setPref(readThemePreference())
    setAccentState(readAccent())
  }, [])

  const pickMode = (next: ThemePreference) => {
    setPref(next)
    setThemePreference(next)
  }

  const pickAccent = (next: AccentId) => {
    setAccentState(next)
    setAccent(next)
  }

  return (
    <Card className="py-4">
      <CardTitle className="text-lg mb-1">主題色</CardTitle>
      <CardDesc className="mb-3">揀你鍾意嘅風格——每種都有淺色同深色。</CardDesc>
      <div
        className="flex flex-wrap gap-2 mb-5"
        role="radiogroup"
        aria-label="主題色"
      >
        {ACCENT_OPTIONS.map((opt) => {
          const active = accent === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pickAccent(opt.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs touch-manipulation transition',
                active
                  ? 'border-accent bg-accent-soft text-accent font-semibold'
                  : 'border-border text-muted hover:text-foreground hover:border-accent/40'
              )}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                style={{ background: opt.swatch }}
                aria-hidden
              />
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="text-sm font-medium mb-1.5">深淺</div>
      <CardDesc className="mb-3">跟系統、淺色、或者深色（會所燈光暗好用）。</CardDesc>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="深淺模式">
        {MODE_OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = pref === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pickMode(id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center touch-manipulation transition',
                active
                  ? 'border-accent bg-accent-soft text-accent font-semibold'
                  : 'border-border text-muted hover:text-foreground hover:border-accent/40'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-muted leading-relaxed">
        設定淨係留喺呢部機；換瀏覽器要再揀一次。
      </p>
    </Card>
  )
}
