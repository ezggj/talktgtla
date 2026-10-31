'use client'

import { useEffect } from 'react'
import {
  applyAccent,
  applyTheme,
  readAccent,
  readThemePreference,
  resolveTheme,
} from '@/lib/theme'

/** Apply stored / system theme + accent on mount; listen for OS changes. */
export function ThemeBootstrap() {
  useEffect(() => {
    const apply = () => {
      applyTheme(resolveTheme(readThemePreference()))
      applyAccent(readAccent())
    }
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
