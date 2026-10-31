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

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        const ok = Boolean(d?.admin)
        setIsAdmin(ok)
        setChecking(false)
        if (ok) void loadStats()
      })
      .catch(() => setChecking(false))
  }, [loadStats])

  useEffect(() => {
    if (!isAdmin) return
    const id = window.setInterval(() => void loadStats(), 60_000)
    return () => window.clearInterval(id)
  }, [isAdmin, loadStats])

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

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          入口保持低調：直接開 /admin、長按傾偈標題、或 Ctrl+Shift+A。一般用戶睇唔到。每分鐘自動刷新一次。
        </p>
      </div>
    </div>
  )
}
