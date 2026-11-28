'use client'

import { useCallback, useEffect, useState } from 'react'
import { readHere, writeHere } from '@/tonight/geo'

export function useHere() {
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)
  const [locState, setLocState] = useState<'asking' | 'ok' | 'off'>('asking')

  const ask = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocState('off')
      return
    }
    setLocState((current) => (current === 'ok' ? current : 'asking'))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setHere(next)
        setLocState('ok')
        writeHere(next)
      },
      () => setLocState('off'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    const saved = readHere()
    if (saved) {
      setHere(saved)
      setLocState('ok')
    }
    ask()
    const timer = window.setTimeout(() => {
      setLocState((current) => (current === 'asking' ? 'off' : current))
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [ask])

  return { here, locState, ask }
}
