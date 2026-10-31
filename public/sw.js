/* Talk tgt la — lightweight service worker (installable PWA + local notifications) */
const CACHE = 'talktgtla-shell-v1'
const PRECACHE = ['/', '/train', '/me', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Network-first for navigations & APIs; cache-first for icons/manifest
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined)
        return res
      }))
    )
    return
  }
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined)
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/train')))
    )
  }
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (data.type === 'NOTIFY') {
    const title = data.title || 'Talk tgt la'
    const options = Object.assign(
      {
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        lang: 'zh-HK',
      },
      data.options || {}
    )
    event.waitUntil(self.registration.showNotification(title, options))
  }
  if (data.type === 'SCHEDULE_REST') {
    const endAt = Number(data.endAt)
    const delay = Math.max(0, endAt - Date.now())
    const title = data.title || '休息完 · 下一組'
    const body = data.body || '返嚟 Talk tgt la 繼續記。'
    const tag = data.tag || 'talktgtla-rest-done'
    // Best-effort: SW timers may be throttled when idle; page timer remains primary.
    const timer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        lang: 'zh-HK',
        renotify: true,
      })
    }, delay)
    // Store so we could clear later if needed
    self.__restTimer = timer
  }
  if (data.type === 'CANCEL_REST') {
    if (self.__restTimer) clearTimeout(self.__restTimer)
    self.__restTimer = null
  }
  if (data.type === 'SCHEDULE_PING') {
    const endAt = Number(data.endAt)
    const delay = Math.max(0, endAt - Date.now())
    const tag = data.tag || 'talktgtla-ping'
    if (!self.__pingTimers) self.__pingTimers = {}
    if (self.__pingTimers[tag]) clearTimeout(self.__pingTimers[tag])
    self.__pingTimers[tag] = setTimeout(() => {
      self.registration.showNotification(data.title || 'Talk tgt la', {
        body: data.body || '',
        tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        lang: 'zh-HK',
        renotify: true,
        data: { url: data.url || '/train' },
      })
      delete self.__pingTimers[tag]
    }, delay)
  }
  if (data.type === 'CANCEL_PING') {
    const tag = data.tag
    if (tag && self.__pingTimers && self.__pingTimers[tag]) {
      clearTimeout(self.__pingTimers[tag])
      delete self.__pingTimers[tag]
    }
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/train'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate?.(target)
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
