'use client'

import { useSyncExternalStore } from 'react'

/** In-flow training tips. Default on. Stored on this device only. */

const KEY = 'talktgtla-train-tips-v1'
const EVENT = 'talktgtla-train-tips'

export function loadTrainTipsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function saveTrainTipsEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore quota */
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function useTrainTipsEnabled() {
  return useSyncExternalStore(subscribe, loadTrainTipsEnabled, () => true)
}
