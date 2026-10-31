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
import type { Provider, User } from '@supabase/supabase-js'

type Props = {
  user: User | null
  configured: boolean
  onSignOut: () => Promise<void>
  compact?: boolean
}

function authErrorMessage(raw: string, kind: 'otp' | 'verify' | 'oauth' = 'otp'): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('rate') ||
    lower.includes('rate_limit') ||
    lower.includes('429') ||
    lower.includes('email rate limit')
  ) {
    return '寄得太密喇——等大概一個鐘，或者改撳 Google。舊電郵入面如果有 6 位碼，可以直接填。'
  }
  if (
    lower.includes('invalid') &&
    (lower.includes('otp') || lower.includes('token') || lower.includes('code') || kind === 'verify')
  ) {
    return '驗證碼唔啱或者過期喇——再寄一次，或者改試 Google。'
  }
  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return '驗證碼過期喇——撳「再寄一次」，或者改用 Google。'
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return '網絡唔穩——檢查吓 Wi‑Fi／數據，陣間再試。'
  }
  if (lower.includes('provider') || lower.includes('not enabled')) {
    return 'Google 登入仲未喺後台開好——試下用電郵啦。'
  }
  if (lower.includes('user not found') || lower.includes('signup')) {
    return '呢個電郵開戶唔到——試下再寄一次，或者改用 Google。'
  }
  // Prefer Cantonese fallback over raw English SDK strings
  if (kind === 'verify') return '驗證唔到——檢查吓 6 位碼，或者再寄一次／試 Google。'
  if (kind === 'oauth') return 'Google 登入唔到——陣間再試，或者改用電郵。'
  if (/^[a-z0-9_ .:/-]+$/i.test(raw.trim()) && raw.length < 120) {
    return `登入唔到：${raw}。試下再寄一次，或者改用 Google。`
  }
  return raw || '登入唔到，陣間再試'
}

function providerNotEnabledMessage(_provider: 'google') {
  return 'Google 登入仲未喺後台開好——試下用電郵啦。'
}

export function LoginCard({ user, configured, onSignOut, compact }: Props) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sent'>('idle')
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState<'google' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const signInWithOAuth = async (provider: 'google') => {
    setErr(null)
    setMsg(null)
    setOauthBusy(provider)
    try {
      const supabase = createClient()
      const options: {
        redirectTo: string
        queryParams?: Record<string, string>
      } = {
        redirectTo: authRedirectTo(),
      }
      if (provider === 'google') {
        options.queryParams = {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options,
      })
      if (error) throw error
      // Browser redirects; keep spinner until unload.
    } catch (e) {
      setOauthBusy(null)
      const raw = e instanceof Error ? e.message : `Google 登入唔到`
      const lower = raw.toLowerCase()
      setErr(
        lower.includes('provider') || lower.includes('not enabled')
          ? providerNotEnabledMessage(provider)
          : authErrorMessage(raw, 'oauth')
      )
    }
  }

  const sendLink = async () => {
    setErr(null)
    setMsg(null)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setErr('電郵寫錯咗喎')
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
      setMsg('登入連結（同 6 位碼）寄咗喇。撳電郵入面條 link，或者喺下面填碼。')
    } catch (e) {
      const raw = e instanceof Error ? e.message : '寄唔到，陣間再試'
      setErr(authErrorMessage(raw, 'otp'))
      if (authErrorMessage(raw, 'otp').includes('寄得太密')) setPhase('sent')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setErr(null)
    const trimmed = email.trim().toLowerCase()
    const token = otp.trim()
    if (!trimmed || token.length < 6) {
      setErr('電郵同 6 位碼都要填吓')
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
      setMsg('入到喇')
      setPhase('idle')
    } catch (e) {
      setPhase('sent')
      setErr(authErrorMessage(e instanceof Error ? e.message : '驗證唔到', 'verify'))
    } finally {
      setBusy(false)
    }
  }

  const oauthLocked = busy || oauthBusy != null

  if (!configured) {
    return (
      <Card>
        <Badge tone="muted">未開好</Badge>
        <CardTitle className="mt-2 text-xl">登入仲未開得</CardTitle>
        <CardDesc className="mt-2">後台未設定好，陣間再嚟啦。</CardDesc>
      </Card>
    )
  }

  if (user) {
    return (
      <Card className={compact ? 'py-4' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone="accent">已登入 · 雲端開咗</Badge>
            <CardTitle className="mt-2 text-xl">資料跟住你走</CardTitle>
            <CardDesc className="mt-2 break-all">{user.email}</CardDesc>
            <p className="mt-2 text-xs text-muted">訓練／飲食／目標會 sync 上雲；呢部機都有本地 cache，離線都睇到。</p>
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
      <div className="relative space-y-5">
        <div>
          <Badge tone="muted">訪客模式</Badge>
          <CardTitle className="mt-2 text-xl">登入好處 · 一屏講清楚</CardTitle>
          <CardDesc className="mt-2">
            而家資料淨係喺呢部機。登入之後：
          </CardDesc>
          <ul className="mt-3 space-y-1.5 text-[12px] text-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-accent font-bold">✓</span><span>訓練／飲食／目標<strong className="font-semibold">上雲</strong>，換機都跟住</span></li>
            <li className="flex gap-2"><span className="text-accent font-bold">✓</span><span>睇齊<strong className="font-semibold">日／週／月</strong>總計同連練</span></li>
            <li className="flex gap-2"><span className="text-accent font-bold">✓</span><span>本機仍然有 cache，<strong className="font-semibold">離線都睇到</strong></span></li>
            <li className="flex gap-2"><span className="text-accent font-bold">✓</span><span>傾偈照舊可以<strong className="font-semibold">匿名</strong>——帳戶唔綁花名</span></li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            onClick={() => void signInWithOAuth('google')}
            disabled={oauthLocked}
          >
            {oauthBusy === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleGlyph />
            )}
            用 Google 登入
          </Button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted">
          <div className="h-px flex-1 bg-border/70" />
          <span>或者用電郵</span>
          <div className="h-px flex-1 bg-border/70" />
        </div>

        <label className="block text-xs text-muted">
          電郵（次選）
          <Input
            type="email"
            autoComplete="email"
            className="mt-1.5"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={oauthLocked}
          />
        </label>
        {phase === 'sent' && (
          <label className="block text-xs text-muted">
            6 位驗證碼（電郵有顯示就填）
            <Input
              inputMode="numeric"
              className="mt-1.5 tracking-widest"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={oauthLocked}
            />
          </label>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => void sendLink()}
            disabled={oauthLocked}
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
              disabled={oauthLocked}
            >
              <LogIn className="h-4 w-4" />
              填碼登入
            </Button>
          )}
        </div>
        {msg && <p className="text-xs text-accent leading-relaxed">{msg}</p>}
        {err && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 leading-relaxed"
          >
            <div className="font-semibold mb-0.5">登入唔到</div>
            {err}
          </div>
        )}
      </div>
    </Card>
  )
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M5.3 14.3l-.8.6-2.3 1.8C3.7 20 7.5 22.5 12 22.5c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.1 6.7A10.4 10.4 0 0 0 1.5 12c0 1.9.5 3.6 1.3 5.1l3.3-2.5A6.2 6.2 0 0 1 5.7 12c0-.9.2-1.8.5-2.6L3.1 6.7z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.2 14.6 1.5 12 1.5 7.5 1.5 3.7 4 1.5 8.1l3.3 2.5C5.6 7.9 8.1 5.3 12 5.3z"
      />
    </svg>
  )
}


/** Slim prompt for train/eat when guest. */
export function LoginPromptBanner({ href = '/me' }: { href?: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3.5 shadow-soft flex items-center justify-between gap-3">
      <p className="text-muted text-xs sm:text-[13px] leading-relaxed">
        本機模式。登入＝上雲＋日週月總計；傾偈照舊匿名。
      </p>
      <Link
        href={href}
        className="shrink-0 inline-flex h-8 items-center rounded-xl bg-accent-soft px-3 text-xs font-semibold text-accent hover:bg-[#b7f0e6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        去登入
      </Link>
    </div>
  )
}
