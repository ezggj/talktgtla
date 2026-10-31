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
          <h1 className="font-serif text-2xl tracking-tight mb-4">管理員</h1>
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
        { label: '註冊用戶', value: stats.total_users, hint: 'profiles' },
        {
          label: '而家喺線',
          value: stats.online_now,
          hint: '最近 90 秒 heartbeat',
        },
        {
          label: '今日活躍',
          value: stats.today_active,
          hint: `香港日 ${stats.day_hk}`,
        },
        {
          label: '訊息總數',
          value: stats.messages_total,
          hint: `今日 ${stats.messages_today}`,
        },
        {
          label: '訓練次數',
          value: stats.workouts_total,
          hint: `今日 ${stats.workouts_today}`,
        },
        {
          label: '飲食紀錄',
          value: stats.meals_total,
          hint: `今日 ${stats.meals_today}`,
        },
        { label: '訓練方案', value: stats.plans_total },
        { label: '封鎖 IP', value: stats.banned_ips },
      ]
    : []

  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Admin
            </p>
            <h1 className="font-serif text-2xl tracking-tight">站務數據</h1>
            {stats?.as_of ? (
              <p className="mt-1 text-xs text-muted">
                更新於 {stats.as_of}（香港時間）
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
                <p className="text-[11px] font-medium text-muted">{c.label}</p>
                <p className="mt-1 font-serif text-3xl tabular-nums tracking-tight">
                  {c.value}
                </p>
                {c.hint ? (
                  <p className="mt-1 text-[11px] text-muted leading-snug">{c.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          入口保持低調：直接開 /admin、長按傾偈標題、或 Ctrl+Shift+A。一般用戶睇唔到。
        </p>
      </div>
    </div>
  )
}
