'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn, LogOut, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { authRedirectTo } from '@/lib/auth/use-user'
import type { User } from '@supabase/supabase-js'

type Props = {
  user: User | null
  configured: boolean
  onSignOut: () => Promise<void>
  compact?: boolean
}

export function LoginCard({ user, configured, onSignOut, compact }: Props) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sent'>('idle')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const sendLink = async () => {
    setErr(null)
    setMsg(null)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setErr('請輸入有效電郵')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: authRedirectTo(),
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      setPhase('sent')
      setMsg('已寄出登入連結（同 6 位碼）。撳電郵入面條 link，或者喺下面輸入碼。')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '寄唔到，稍後再試')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setErr(null)
    const trimmed = email.trim().toLowerCase()
    const token = otp.trim()
    if (!trimmed || token.length < 6) {
      setErr('請輸入電郵同 6 位碼')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token,
        type: 'email',
      })
      if (error) throw error
      setMsg('登入成功')
      setPhase('idle')
    } catch (e) {
      setPhase('sent')
      setErr(e instanceof Error ? e.message : '驗證失敗，試下再寄一次')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <Card>
        <Badge tone="muted">未設定</Badge>
        <CardTitle className="mt-2 text-xl">登入未就緒</CardTitle>
        <CardDesc className="mt-2">Supabase 環境變數未設定。</CardDesc>
      </Card>
    )
  }

  if (user) {
    return (
      <Card className={compact ? 'py-4' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone="accent">已登入</Badge>
            <CardTitle className="mt-2 text-xl">雲端同步開緊</CardTitle>
            <CardDesc className="mt-2 break-all">{user.email}</CardDesc>
            <p className="mt-2 text-xs text-muted">訓練同飲食會跟住你跨裝置；本機仲有 cache。</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onSignOut()}
            className="shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            登出
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-soft),_transparent_60%)] pointer-events-none" />
      <div className="relative space-y-4">
        <div>
          <Badge tone="accent">會員</Badge>
          <CardTitle className="mt-2 text-xl">電郵登入同步</CardTitle>
          <CardDesc className="mt-2">
            用 magic link 或 6 位碼登入。訪客可以繼續試訓練／飲食，登入先會上雲同睇齊歷史匯總。
          </CardDesc>
        </div>
        <label className="block text-xs text-muted">
          電郵
          <Input
            type="email"
            autoComplete="email"
            className="mt-1.5"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        {phase === 'sent' && (
          <label className="block text-xs text-muted">
            6 位驗證碼（如果電郵有顯示）
            <Input
              inputMode="numeric"
              className="mt-1.5 tracking-widest"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={busy}
            />
          </label>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1"
            onClick={() => void sendLink()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {phase === 'sent' ? '再寄一次' : '寄登入連結'}
          </Button>
          {phase === 'sent' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => void verifyCode()}
              disabled={busy}
            >
              <LogIn className="h-4 w-4" />
              輸入碼登入
            </Button>
          )}
        </div>
        {msg && <p className="text-xs text-accent leading-relaxed">{msg}</p>}
        {err && <p className="text-xs text-red-600 leading-relaxed">{err}</p>}
      </div>
    </Card>
  )
}

/** Slim prompt for train/eat when guest. */
export function LoginPromptBanner({ href = '/me' }: { href?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft flex items-center justify-between gap-3">
      <p className="text-muted text-xs sm:text-sm leading-relaxed">
        而家係本機模式。登入之後訓練／飲食會上雲，飲食仲可以睇日／週／月匯總。
      </p>
      <Link
        href={href}
        className="shrink-0 text-xs font-semibold text-accent hover:underline"
      >
        去登入
      </Link>
    </div>
  )
}
