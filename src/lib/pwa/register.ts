/** Register custom SW once on the client. */

let registering: Promise<ServiceWorkerRegistration | null> | null = null

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }
  if (registering) return registering
  registering = (async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      return reg
    } catch {
      return null
    }
  })()
  return registering
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches
  const ios = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone
  return Boolean(mq || ios)
}
