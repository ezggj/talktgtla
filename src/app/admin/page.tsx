'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type AdminStats = {
  total_users: number
  online_now: number
  today_active: number
  messages_total: number
  messages_today: number
  workouts_total: number
  workouts_today: number
  meals_total: number
  meals_today: number
  plans_total: number
  banned_ips: number
  day_hk: string
  as_of: string
}


type FeedbackItem = {
  id: string
  created_at: string
  body: string
  category: string
  page: string | null
  contact: string | null
  status: string
  guest_id?: string | null
  user_id?: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  idea: '提議',
  bug: '壞咗',
  love: '讚好',
  other: '其他',
}

const STATUS_LABEL: Record<string, string> = {
  new: '新',
  seen: '已睇',
  done: '搞掂',
  wont: '唔做',
}

function relativeTimeHk(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const now = Date.now()
    const diffSec = Math.round((now - d.getTime()) / 1000)
    if (diffSec < 60) return '啱啱'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分鐘前`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小時前`
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} 日前`
    return new Intl.DateTimeFormat('zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return iso
  }
}

type StatCard = {
  label: string
  value: number | string
  hint?: string
  pulse?: boolean
}

function formatAsOfHk(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return iso
  }
}

function fmt(n: number | string) {
  if (typeof n === 'number') return n.toLocaleString('zh-HK')
  return n
}

/** Discreet admin — login + stats. Not linked from public UI. */
export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'new' | 'seen' | 'done' | 'wont'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatsError(data?.error || '讀取失敗')
        setStats(null)
        return
      }
      setStats(data.stats as AdminStats)
    } catch {
      setStatsError('網絡錯誤')
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const q = feedbackFilter === 'all' ? '' : `?status=${feedbackFilter}`
      const res = await fetch(`/api/admin/feedback${q}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedbackError(data?.error || '讀取意見失敗')
        setFeedback([])
        return
      }
      setFeedback((data.feedback || []) as FeedbackItem[])
    } catch {
      setFeedbackError('網絡錯誤')
      setFeedback([])
    } finally {
      setFeedbackLoading(false)
    }
  }, [feedbackFilter])

  const setFeedbackStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFeedbackError(data?.error || '更新失敗')
        return
      }
      await loadFeedback()
    } catch {
      setFeedbackError('網絡錯誤')
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        const ok = Boolean(d?.admin)
        setIsAdmin(ok)
        setChecking(false)
        if (ok) {
          void loadStats()
          void loadFeedback()
        }
      })
      .catch(() => setChecking(false))
  }, [loadStats, loadFeedback])

  useEffect(() => {
    if (!isAdmin) return
    const id = window.setInterval(() => {
      void loadStats()
      void loadFeedback()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [isAdmin, loadStats, loadFeedback])

  useEffect(() => {
    if (!isAdmin) return
    void loadFeedback()
  }, [isAdmin, loadFeedback])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError(res.status === 401 ? '密碼錯誤' : '登入失敗')
        return
      }
      setIsAdmin(true)
      setPassword('')
      void loadStats()
      void loadFeedback()
    } catch {
      setError('網絡錯誤')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAdmin(false)
    setStats(null)
    setFeedback([])
  }

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-sm text-muted">
        …
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-hover border border-border"
        >
          <h1 className="font-serif text-2xl tracking-tight mb-1">管理員</h1>
          <p className="text-xs text-muted mb-4">站務數據 · 低調入口</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理員密碼"
            className="w-full border border-border rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/25 mb-2 bg-surface"
          />
          {error && <p className="text-xs text-danger mb-2">{error}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <Link
              href="/"
              className="text-sm px-3 py-1.5 rounded-xl text-muted hover:bg-black/[0.04]"
            >
              返回
            </Link>
            <button
              type="submit"
              disabled={busy || !password}
              className="text-sm px-3 py-1.5 rounded-xl bg-accent text-white hover:bg-[#0d6a63] disabled:opacity-50"
            >
              {busy ? '登入中…' : '登入'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  const cards: StatCard[] = stats
    ? [
        { label: '註冊用戶', value: stats.total_users, hint: '有帳戶嘅人' },
        {
          label: '而家喺線',
          value: stats.online_now,
          hint: '近 90 秒有心跳',
          pulse: stats.online_now > 0,
        },
        {
          label: '今日活躍',
          value: stats.today_active,
          hint: `香港日 ${stats.day_hk}`,
        },
        {
          label: '訊息',
          value: stats.messages_total,
          hint: `今日 +${stats.messages_today}`,
        },
        {
          label: '訓練',
          value: stats.workouts_total,
          hint: `今日 +${stats.workouts_today}`,
        },
        {
          label: '飲食紀錄',
          value: stats.meals_total,
          hint: `今日 +${stats.meals_today}`,
        },
        { label: '訓練方案', value: stats.plans_total, hint: '雲端方案總數' },
        { label: '封鎖 IP', value: stats.banned_ips, hint: '被 ban 嘅位址' },
      ]
    : []

  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted">Admin</p>
            <h1 className="font-serif text-2xl tracking-tight">站務數據</h1>
            {stats?.as_of ? (
              <p className="mt-1 text-xs text-muted">
                更新於 {formatAsOfHk(stats.as_of)}
                <span className="text-muted/80"> · 香港時間</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStats()}
              disabled={statsLoading}
              className="text-sm px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-black/[0.03] disabled:opacity-50"
            >
              {statsLoading ? '更新中…' : '刷新'}
            </button>
            <Link
              href="/"
              className="text-sm px-3 py-1.5 rounded-xl text-muted hover:bg-black/[0.04]"
            >
              返傾偈
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm px-3 py-1.5 rounded-xl text-muted underline underline-offset-2"
            >
              登出
            </button>
          </div>
        </header>

        {statsError ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {statsError}
          </div>
        ) : null}

        {statsLoading && !stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-[20px] border border-border bg-surface skeleton-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-[20px] border border-border bg-surface p-4 shadow-soft"
              >
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-muted">{c.label}</p>
                  {c.pulse ? (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <p className="mt-1 font-serif text-3xl tabular-nums tracking-tight">
                  {fmt(c.value)}
                </p>
                {c.hint ? (
                  <p className="mt-1 text-[11px] text-muted leading-snug">{c.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}


        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl tracking-tight">用戶意見</h2>
              <p className="text-xs text-muted mt-0.5">最新 100 條 · 值得改就改</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'new', 'seen', 'done', 'wont'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedbackFilter(s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    feedbackFilter === s
                      ? 'bg-accent text-white border-accent'
                      : 'border-border bg-surface text-muted hover:bg-black/[0.03]'
                  }`}
                >
                  {s === 'all' ? '全部' : STATUS_LABEL[s]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void loadFeedback()}
                disabled={feedbackLoading}
                className="text-sm px-2.5 py-1 rounded-xl border border-border bg-surface hover:bg-black/[0.03] disabled:opacity-50"
              >
                {feedbackLoading ? '…' : '刷新'}
              </button>
            </div>
          </div>

          {feedbackError ? (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {feedbackError}
            </div>
          ) : null}

          {feedbackLoading && feedback.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-[20px] border border-border bg-surface skeleton-pulse" />
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              暫時未有意見
            </div>
          ) : (
            <ul className="space-y-2.5">
              {feedback.map((f) => (
                <li
                  key={f.id}
                  className="rounded-[20px] border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent">
                      {CATEGORY_LABEL[f.category] || f.category}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      {STATUS_LABEL[f.status] || f.status}
                    </span>
                    <span className="text-[11px] text-muted">{relativeTimeHk(f.created_at)}</span>
                    {f.page ? (
                      <span className="text-[11px] text-muted font-mono">{f.page}</span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{f.body}</p>
                  {f.contact ? (
                    <p className="mt-2 text-[11px] text-muted break-all">聯絡：{f.contact}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        { status: 'seen', label: '已睇' },
                        { status: 'done', label: '搞掂' },
                        { status: 'wont', label: '唔做' },
                        { status: 'new', label: '重置' },
                      ] as const
                    ).map((b) => (
                      <button
                        key={b.status}
                        type="button"
                        disabled={updatingId === f.id || f.status === b.status}
                        onClick={() => void setFeedbackStatus(f.id, b.status)}
                        className="text-[11px] px-2.5 py-1 rounded-xl border border-border bg-surface-muted hover:bg-accent-soft/60 disabled:opacity-40"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-[20px] border border-border bg-surface p-4 shadow-soft">
          <h2 className="font-serif text-lg tracking-tight">安全／限速備註</h2>
          <ul className="mt-2 space-y-1.5 text-[11px] text-muted leading-relaxed list-disc pl-4">
            <li>訊息 burst：3 條／10 秒；滑窗 8 條／60 秒 → 429「傾得太密」。</li>
            <li>硬 ban：同一 IP 超過 20 條／60 秒 → 寫入封鎖名單（DB）。</li>
            <li>刪除訊息／封鎖／解封 IP 都要二次確認；丟棄進行中訓練亦有 confirm。</li>
            <li>CSP：default self、object-src none、manifest-src self、Permissions-Policy 收緊相機／定位。</li>
          </ul>
        </section>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          入口保持低調：直接開 /admin、長按傾偈標題、或 Ctrl+Shift+A。一般用戶睇唔到。每分鐘自動刷新一次。
        </p>
      </div>
    </div>
  )
}
