'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/** Discreet admin login — not linked from the public chat UI. */
export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.admin) router.replace('/')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [router])

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
      router.replace('/')
    } catch {
      setError('網絡錯誤')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-sm text-muted">
        …
      </div>
    )
  }

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
