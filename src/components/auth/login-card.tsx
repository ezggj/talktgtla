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

function otpErrorMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('rate') ||
    lower.includes('rate_limit') ||
    lower.includes('429') ||
    lower.includes('email rate limit')
  ) {
    return '寄得太密喇——等大概一個鐘，或者改撳 Google。舊電郵入面如果有 6 位碼，可以直接填。'
  }
  return raw
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
          : raw
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
      setErr(otpErrorMessage(raw))
      if (otpErrorMessage(raw).includes('寄得太密')) setPhase('sent')
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
      setErr(e instanceof Error ? e.message : '驗證唔到，試下再寄一次')
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
            <Badge tone="accent">已登入</Badge>
            <CardTitle className="mt-2 text-xl">資料跟住你走</CardTitle>
            <CardDesc className="mt-2 break-all">{user.email}</CardDesc>
            <p className="mt-2 text-xs text-muted">訓練同飲食會 sync 上雲，換機都睇到；手機都有本地 cache。</p>
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
          <Badge tone="accent">登入</Badge>
          <CardTitle className="mt-2 text-xl">登入先完整用</CardTitle>
          <CardDesc className="mt-2">
            撳 Google 最方便。訪客都可以試訓練／飲食；登入先會上雲同睇齊日週月統計。
          </CardDesc>
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
          <div className="h-px flex-1 bg-border" />
          <span>或者用電郵</span>
          <div className="h-px flex-1 bg-border" />
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
        {err && <p className="text-xs text-red-600 leading-relaxed">{err}</p>}
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
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft flex items-center justify-between gap-3">
      <p className="text-muted text-xs sm:text-sm leading-relaxed">
        而家係本機模式。登入之後訓練／飲食會上雲，仲可以睇日／週／月總計。
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
