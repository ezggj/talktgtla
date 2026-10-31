'use client'

import { useEffect } from 'react'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/lib/theme'

/** Apply stored / system theme on mount and when OS preference changes (system mode). */
export function ThemeBootstrap() {
  useEffect(() => {
    const apply = () => applyTheme(resolveTheme(readThemePreference()))
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (readThemePreference() === 'system') apply()
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return null
}

export type { ThemePreference }
