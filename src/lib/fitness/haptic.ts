/** Vibration + optional Notification when rest timer ends. */

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

/** Best-effort browser notification (needs prior permission). */
export async function notifyRestDone() {
  buzzRestDone()
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  try {
    let perm = Notification.permission
    if (perm === 'default') {
      // Soft ask once per session when rest first completes
      perm = await Notification.requestPermission()
    }
    if (perm !== 'granted') return
    const n = new Notification('休息完喇', {
      body: '下一組準備好——返嚟 Talk tgt la 繼續記。',
      tag: 'talktgtla-rest-done',
      silent: false,
    })
    window.setTimeout(() => n.close(), 5000)
  } catch {
    /* ignore — iOS Safari often blocks */
  }
}

export function flashDocumentTitle(msg: string, ms = 4000) {
  if (typeof document === 'undefined') return
  const prev = document.title
  document.title = msg
  window.setTimeout(() => {
    if (document.title === msg) document.title = prev
  }, ms)
}
