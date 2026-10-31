/** Local notifications via Notification API + service worker showNotification. */

export type AppNotificationPayload = {
  title: string
  body?: string
  tag?: string
  url?: string
  renotify?: boolean
}

const PERM_ASKED_KEY = 'talktgtla-notif-asked-v1'

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function hasAskedNotificationPermission(): boolean {
  try {
    return localStorage.getItem(PERM_ASKED_KEY) === '1'
  } catch {
    return false
  }
}

export async function requestNotificationPermissionCantonese(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  try {
    localStorage.setItem(PERM_ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

async function viaServiceWorker(payload: AppNotificationPayload): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    if (!reg) return false
    // Prefer SW showNotification (works better when tab backgrounded / installed PWA)
    if (reg.showNotification) {
      await reg.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag || 'talktgtla',
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        lang: 'zh-HK',
        data: { url: payload.url || '/train' },
        ...(payload.renotify != null ? { renotify: payload.renotify } : { renotify: true }),
      } as NotificationOptions)
      return true
    }
    const sw = navigator.serviceWorker.controller
    if (sw) {
      sw.postMessage({
        type: 'NOTIFY',
        title: payload.title,
        options: {
          body: payload.body,
          tag: payload.tag || 'talktgtla',
          renotify: payload.renotify ?? true,
          data: { url: payload.url || '/train' },
        },
      })
      return true
    }
  } catch {
    /* fall through */
  }
  return false
}

/** Show a local notification if permission already granted. */
export async function showAppNotification(payload: AppNotificationPayload): Promise<void> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  const ok = await viaServiceWorker(payload)
  if (ok) return
  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag || 'talktgtla',
      silent: false,
    })
    window.setTimeout(() => n.close(), 6000)
  } catch {
    /* iOS Safari often blocks until installed */
  }
}

/** Schedule rest-done notification via SW timer (best-effort) + return end timestamp. */
export async function scheduleRestNotification(restSec: number): Promise<number | null> {
  if (typeof window === 'undefined') return null
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null
  const endAt = Date.now() + Math.max(1, restSec) * 1000
  try {
    const reg = await navigator.serviceWorker?.ready
    const sw = navigator.serviceWorker?.controller || reg?.active
    sw?.postMessage({
      type: 'SCHEDULE_REST',
      endAt,
      title: '休息完 · 下一組',
      body: '返嚟 Talk tgt la 繼續記。',
      tag: 'talktgtla-rest-done',
    })
  } catch {
    /* ignore */
  }
  return endAt
}

export async function cancelScheduledRestNotification() {
  try {
    const sw = navigator.serviceWorker?.controller
    sw?.postMessage({ type: 'CANCEL_REST' })
  } catch {
    /* ignore */
  }
}
