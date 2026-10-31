/** Vibration + optional Notification when rest timer ends. */

import {
  cancelScheduledRestNotification,
  showAppNotification,
  scheduleRestNotification,
  requestNotificationPermissionCantonese,
  notificationPermission,
  hasAskedNotificationPermission,
} from '@/lib/pwa/notifications'

export function buzzLight() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(18)
  } catch {
    /* ignore */
  }
}

export function buzzRestDone() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80, 40, 120])
    }
  } catch {
    /* ignore */
  }
}

/** Soft-ask once, then notify via SW when possible. */
export async function notifyRestDone() {
  buzzRestDone()
  void cancelScheduledRestNotification()
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  try {
    let perm: NotificationPermission | 'unsupported' = Notification.permission
    if (perm === 'default' && !hasAskedNotificationPermission()) {
      // Soft ask once when rest first completes
      perm = await requestNotificationPermissionCantonese()
    }
    if (perm !== 'granted') return
    await showAppNotification({
      title: '休息完 · 下一組',
      body: '返嚟 Talk tgt la 繼續記。',
      tag: 'talktgtla-rest-done',
      url: '/train',
    })
  } catch {
    /* ignore — iOS Safari often blocks until installed */
  }
}

/** Call when a rest countdown starts so SW can fire even if the tab is backgrounded. */
export async function armRestNotification(restSec: number) {
  if (notificationPermission() !== 'granted') return
  await scheduleRestNotification(restSec)
}

export function flashDocumentTitle(msg: string, ms = 4000) {
  if (typeof document === 'undefined') return
  const prev = document.title
  document.title = msg
  window.setTimeout(() => {
    if (document.title === msg) document.title = prev
  }, ms)
}
