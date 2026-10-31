'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  disableProteinReminder,
  enableProteinReminder,
  loadProteinRemindPref,
  type ProteinRemindPref,
} from '@/lib/fitness/protein-reminder'
import { notificationPermission } from '@/lib/pwa/notifications'
import { cn } from '@/lib/utils'

const HOURS = [18, 19, 20, 21, 22]

export function ProteinReminderCard({ className }: { className?: string }) {
  const [pref, setPref] = useState<ProteinRemindPref>({ enabled: false, hour: 20 })
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPref(loadProteinRemindPref())
  }, [])

  const flash = (msg: string) => {
    setNote(msg)
    window.setTimeout(() => setNote(null), 2800)
  }

  const toggle = async () => {
    setBusy(true)
    try {
      if (pref.enabled) {
        disableProteinReminder()
        setPref((p) => ({ ...p, enabled: false }))
        flash('已關蛋白晚間提醒')
        return
      }
      const { ok, permission } = await enableProteinReminder(pref.hour)
      if (!ok) {
        if (permission === 'denied') flash('通知被拒絕——去系統設定開返')
        else if (permission === 'unsupported') flash('呢部機唔支援通知')
        else flash('要允許通知先開到提醒')
        return
      }
      setPref((p) => ({ ...p, enabled: true }))
      flash(`已開 · 每日 ${pref.hour}:00 前後檢查蛋白`)
    } finally {
      setBusy(false)
    }
  }

  const setHour = (hour: number) => {
    const next = { ...pref, hour }
    setPref(next)
    if (pref.enabled) {
      void enableProteinReminder(hour)
    }
  }

  const perm = typeof window !== 'undefined' ? notificationPermission() : 'default'

  return (
    <Card className={cn('py-4', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardTitle className="text-lg">蛋白晚間提醒</CardTitle>
          <CardDesc className="mt-1">
            夜晚未夠蛋白目標就推一下——一掣去飲食加乳清。
          </CardDesc>
        </div>
        <Button
          type="button"
          size="sm"
          variant={pref.enabled ? 'soft' : 'secondary'}
          disabled={busy}
          onClick={() => void toggle()}
          className="shrink-0"
        >
          {pref.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          {pref.enabled ? '開緊' : '開啟'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHour(h)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] border touch-manipulation',
              pref.hour === h
                ? 'border-accent bg-accent-soft text-accent font-semibold'
                : 'border-border text-muted hover:text-foreground'
            )}
          >
            {h}:00
          </button>
        ))}
      </div>
      {perm === 'denied' && (
        <p className="mt-2 text-[11px] text-warning leading-relaxed">
          系統通知已關——去 Safari／Chrome 設定開返「Talk tgt la」通知。
        </p>
      )}
      {note && <p className="mt-2 text-[11px] text-accent font-medium">{note}</p>}
    </Card>
  )
}
