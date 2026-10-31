'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { isStandaloneDisplay } from '@/lib/pwa/register'
import {
  hasAskedNotificationPermission,
  notificationPermission,
  requestNotificationPermissionCantonese,
} from '@/lib/pwa/notifications'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'talktgtla-pwa-install-dismiss-v1'
const WORKOUT_HINT_KEY = 'talktgtla-pwa-after-workout-v1'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const t = Number(raw)
    if (!Number.isFinite(t)) return false
    // hide 14 days
    return Date.now() - t < 14 * 86400000
  } catch {
    return false
  }
}

export function InstallPrompt({
  className,
  /** Compact card for /me; banner after workout elsewhere */
  variant = 'card',
  forceAfterWorkout = false,
}: {
  className?: string
  variant?: 'card' | 'banner'
  forceAfterWorkout?: boolean
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [notifLine, setNotifLine] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandaloneDisplay()) return
    if (dismissedRecently() && !forceAfterWorkout) return

    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isSafari = isIos && !('BeforeInstallPromptEvent' in window)

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    // After first finished workout, or always on /me card
    let show = forceAfterWorkout
    try {
      if (forceAfterWorkout) localStorage.setItem(WORKOUT_HINT_KEY, '1')
      if (variant === 'card') show = true
      if (localStorage.getItem(WORKOUT_HINT_KEY) === '1' && variant === 'banner') show = true
    } catch {
      /* ignore */
    }

    if (show && isSafari) {
      setIosHint(true)
      setVisible(true)
    } else if (show && !isSafari) {
      // Chrome may fire BIP later; still show soft copy
      setVisible(true)
    }

    const perm = notificationPermission()
    if (perm === 'default' && !hasAskedNotificationPermission()) setNotifLine(true)

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [forceAfterWorkout, variant])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }, [])

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        /* ignore */
      }
      setDeferred(null)
    }
    setVisible(false)
  }, [deferred])

  const askNotif = useCallback(async () => {
    const p = await requestNotificationPermissionCantonese()
    setNotifLine(p === 'default')
  }, [])

  if (!visible || isStandaloneDisplay()) return null

  return (
    <div
      className={cn(
        'rounded-2xl border border-accent/25 bg-accent-soft/50 px-3.5 py-3',
        variant === 'banner' && 'shadow-soft',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight text-foreground">加到主畫面</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {iosHint
              ? 'Safari 撳分享 →「加至主畫面」，之後開得似 app，組間通知都穩陣啲。'
              : '一鍵加主畫面，開得似 app——休息完都會提你下一組。'}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {!iosHint && deferred && (
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white touch-manipulation"
              >
                加落去
              </button>
            )}
            {notifLine && (
              <button
                type="button"
                onClick={() => void askNotif()}
                className="rounded-full border border-accent/30 bg-white/70 px-3.5 py-1.5 text-[12px] font-medium text-accent touch-manipulation"
              >
                開組間通知
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-3 py-1.5 text-[12px] text-muted touch-manipulation"
            >
              之後再講
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-muted hover:text-foreground touch-manipulation"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
