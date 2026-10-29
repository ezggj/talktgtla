'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-zinc-900 text-sm text-zinc-500">
        …
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-xl border border-zinc-200 dark:border-zinc-700"
      >
        <h1 className="text-base font-semibold mb-3">管理員</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理員密碼"
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/50 mb-2 bg-transparent"
        />
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            返回
          </button>
          <button
            type="submit"
            disabled={busy || !password}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? '登入中…' : '登入'}
          </button>
        </div>
      </form>
    </div>
  )
}
