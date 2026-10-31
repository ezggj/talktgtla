'use client'

import { useState } from 'react'
import { Flag, Ban, Loader2 } from 'lucide-react'
import {
  REPORT_REASONS,
  buildReportBody,
  type ReportReasonId,
} from '@/lib/chat/moderation'
import { getOrCreateEatGuestId } from '@/lib/fitness/eat-guest-id'
import { cn } from '@/lib/utils'

type Props = {
  messageId: number
  username: string
  content: string
  onBlocked: (username: string) => void
  className?: string
}

export function MessageModActions({ messageId, username, content, onBlocked, className }: Props) {
  const [open, setOpen] = useState<'menu' | 'report' | null>(null)
  const [reason, setReason] = useState<ReportReasonId>('spam')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const flash = (msg: string) => {
    setNote(msg)
    window.setTimeout(() => setNote(null), 2600)
  }

  const confirmBlock = () => {
    const name = username.trim() || '匿名'
    const ok = window.confirm(
      `封鎖「${name}」？\n\n之後呢個花名嘅訊息會喺你部機隱藏（只影響你）。可以喺設定式清單解除。`
    )
    if (!ok) return
    onBlocked(name)
    setOpen(null)
    flash(`已封鎖「${name}」`)
  }

  const submitReport = async () => {
    const meta = REPORT_REASONS.find((r) => r.id === reason) || REPORT_REASONS[0]
    const body = buildReportBody({
      reasonId: reason,
      reasonLabel: meta.label,
      username,
      messageId,
      snippet: content,
    })
    setBusy(true)
    try {
      const guestId = getOrCreateEatGuestId()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          category: 'other',
          page: '/chat',
          guestId,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        flash(data.error || '舉報送唔到，稍後再試')
        return
      }
      flash('已收到舉報，我哋會睇')
      setOpen(null)
    } catch {
      flash('網絡唔穩，舉報失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => (v ? null : 'menu'))}
        className="text-xs text-muted hover:text-foreground active:opacity-70 transition-opacity font-medium touch-manipulation"
        aria-label="舉報或封鎖"
      >
        更多
      </button>

      {open === 'menu' && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-2xl border border-border bg-surface p-1.5 shadow-hover space-y-0.5">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-foreground hover:bg-accent-soft touch-manipulation"
            onClick={() => setOpen('report')}
          >
            <Flag className="h-3.5 w-3.5 text-warning" />
            舉報呢條訊息
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-danger hover:bg-red-50 dark:hover:bg-red-950/30 touch-manipulation"
            onClick={confirmBlock}
          >
            <Ban className="h-3.5 w-3.5" />
            封鎖呢個花名
          </button>
          <button
            type="button"
            className="w-full rounded-xl px-2.5 py-1.5 text-left text-[10px] text-muted"
            onClick={() => setOpen(null)}
          >
            取消
          </button>
        </div>
      )}

      {open === 'report' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-[20px] border border-border bg-surface p-4 shadow-hover space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">舉報訊息</h3>
                <p className="mt-1 text-[11px] text-muted leading-relaxed">
                  舉報會交去平台睇；唔會即時刪除。假舉報可能被忽視。
                </p>
              </div>
              <button type="button" className="text-muted text-sm px-1" onClick={() => setOpen(null)} aria-label="關閉">
                ✕
              </button>
            </div>
            <p className="text-[11px] text-muted truncate">對象：{username || '匿名'}</p>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation transition',
                    reason === r.id
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-muted hover:text-foreground'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitReport()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 touch-manipulation"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              提交舉報
            </button>
          </div>
        </div>
      )}

      {note && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-accent shadow-soft z-20">
          {note}
        </span>
      )}
    </div>
  )
}
