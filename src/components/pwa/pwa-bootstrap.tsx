'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register'

/** Registers SW once for the whole app. */
export function PwaBootstrap() {
  useEffect(() => {
    void registerServiceWorker()
  }, [])
  return null
}
