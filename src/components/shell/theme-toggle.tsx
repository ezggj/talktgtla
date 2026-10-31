'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import {
  readThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: '跟系統', icon: Monitor },
  { id: 'dark', label: '開', icon: Moon },
  { id: 'light', label: '關', icon: Sun },
]

/** 「深色模式：跟系統／開／關」 */
export function ThemeToggleCard() {
  const [pref, setPref] = useState<ThemePreference>('system')

  useEffect(() => {
    setPref(readThemePreference())
  }, [])

  const pick = (next: ThemePreference) => {
    setPref(next)
    setThemePreference(next)
  }

  return (
    <Card className="py-4">
      <CardTitle className="text-lg mb-1">深色模式</CardTitle>
      <CardDesc className="mb-3">
        會所燈光暗就開——跟系統、開深色、或者關返日間。
      </CardDesc>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="深色模式">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = pref === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(id)}
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
