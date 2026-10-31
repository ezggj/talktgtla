'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  notificationPermission,
  requestNotificationPermissionCantonese,
} from '@/lib/pwa/notifications'
import { cn } from '@/lib/utils'

function permLabel(p: NotificationPermission | 'unsupported') {
  if (p === 'granted') return '已允許'
  if (p === 'denied') return '已拒絕'
  if (p === 'unsupported') return '唔支援'
  return '未決定'
}

export function NotificationsCard() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    setPerm(notificationPermission())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const ask = async () => {
    setBusy(true)
    setNote(null)
    try {
      const p = await requestNotificationPermissionCantonese()
      setPerm(p)
      if (p === 'granted') setNote('得喇——組間休息完同凑局有人入台可以提你。')
      else if (p === 'denied') setNote('系統拒絕咗——去手機設定 → Talk tgt la → 通知，再開返。')
      else if (p === 'unsupported') setNote('呢部機／瀏覽器唔支援通知。加主畫面之後 iPhone 會穩陣啲。')
      else setNote('仲未允許——再撳一次試下。')
    } finally {
      setBusy(false)
    }
  }

  const ok = perm === 'granted'

  return (
    <Card className="py-4">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            ok ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-muted'
          )}
        >
          {ok ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">通知</CardTitle>
          <CardDesc className="mt-0.5">
            組間休息完、凑局有人入台——本地通知，唔使開住畫面。
          </CardDesc>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold border',
            ok
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-border text-muted'
          )}
        >
          {permLabel(perm)}
        </span>
      </div>
      <ul className="mb-3 space-y-1 text-[11px] text-muted leading-relaxed px-0.5">
        <li>· 組間：倒數完 buzz／通知「下一組」</li>
        <li>· 凑局：你開嘅台有人入嚟會提（要開住通知）</li>
      </ul>
      {perm !== 'granted' && perm !== 'unsupported' && (
        <Button type="button" className="w-full" disabled={busy} onClick={() => void ask()}>
          {perm === 'denied' ? '我知，去系統設定開' : '允許通知'}
        </Button>
      )}
      {perm === 'denied' && (
        <p className="mt-2 text-[11px] text-warning leading-relaxed">
          瀏覽器已封鎖——Safari／Chrome 網站設定入面開「通知」。
        </p>
      )}
      {note && <p className="mt-2 text-[11px] text-accent font-medium leading-relaxed">{note}</p>}
    </Card>
  )
}
