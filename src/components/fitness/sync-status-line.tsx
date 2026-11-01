'use client'

import { useSyncExternalStore } from 'react'
import { CloudOff, Cloud } from 'lucide-react'
import { offlineQueueCount } from '@/lib/fitness/offline-queue'
import { syncStatusText } from '@/lib/fitness/sync-status'

const QUEUE_EVENT = 'talktgtla-offline-queue'

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange)
  window.addEventListener('offline', onStoreChange)
  return () => {
    window.removeEventListener('online', onStoreChange)
    window.removeEventListener('offline', onStoreChange)
  }
}

function subscribeQueue(onStoreChange: () => void) {
  window.addEventListener(QUEUE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('online', onStoreChange)
  return () => {
    window.removeEventListener(QUEUE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('online', onStoreChange)
  }
}

function onlineNow() {
  return navigator.onLine
}

export function SyncStatusLine({
  loggedIn,
  note,
  className,
}: {
  loggedIn: boolean
  note?: string | null
  className?: string
}) {
  const online = useSyncExternalStore(subscribeOnline, onlineNow, () => true)
  const pending = useSyncExternalStore(subscribeQueue, offlineQueueCount, () => 0)
  const text = syncStatusText({ online, loggedIn, pending, note })
  if (!text) return null
  const offline = text.startsWith('未有網') || text.startsWith('同步唔到')
  const Icon = offline ? CloudOff : Cloud
  return (
    <p
      role="status"
      className={
        className ||
        'flex items-center gap-1.5 rounded-2xl border border-border bg-surface-muted px-3 py-2 text-[12px] leading-relaxed text-foreground'
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      <span>{text}</span>
    </p>
  )
}
