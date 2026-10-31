'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  decodeWallSnapshot,
  isPublicWallEnabled,
  loadPublicWallSnapshot,
  type PublicWallSnapshot,
} from '@/lib/fitness/public-wall'

export function WallClient({ slug }: { slug: string }) {
  const search = useSearchParams()
  const [snap, setSnap] = useState<PublicWallSnapshot | null>(null)
  const [mode, setMode] = useState<'loading' | 'ok' | 'closed' | 'missing'>('loading')

  const token = search.get('s') || ''

  useEffect(() => {
    const fromQuery = token ? decodeWallSnapshot(token) : null
    if (fromQuery) {
      setSnap(fromQuery)
      setMode('ok')
      return
    }
    const local = loadPublicWallSnapshot()
    if (local && local.slug === slug && isPublicWallEnabled()) {
      setSnap(local)
      setMode('ok')
      return
    }
    if (local && local.slug === slug && !isPublicWallEnabled()) {
      setMode('closed')
      return
    }
    setMode('missing')
  }, [slug, token])

  const updatedLabel = useMemo(() => {
    if (!snap?.updatedAt) return ''
    try {
      return new Date(snap.updatedAt).toLocaleString('zh-HK', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [snap])

  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto space-y-4">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-accent mb-1">公開訓練牆</p>
          <h1 className="font-serif text-2xl tracking-tight">一週摘要</h1>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            可關嘅分享頁——唔係即時社交動態。
          </p>
        </div>

        {mode === 'loading' && (
          <Card className="py-8 text-center text-sm text-muted">載入中…</Card>
        )}

        {mode === 'closed' && (
          <Card className="py-6 space-y-2">
            <CardTitle className="text-lg">呢個牆已關閉</CardTitle>
            <CardDesc>擁有者關咗公開訓練牆，外人暫時睇唔到。</CardDesc>
            <Link href="/me/settings" className="text-sm font-medium text-accent">
              去設定 →
            </Link>
          </Card>
        )}

        {mode === 'missing' && (
          <Card className="py-6 space-y-2">
            <CardTitle className="text-lg">搵唔到呢個牆</CardTitle>
            <CardDesc>
              連結可能過期、未開公開，或者未帶摘要 snapshot。完整社交牆之後再加。
            </CardDesc>
            <div className="flex gap-3 pt-1">
              <Link href="/train" className="text-sm font-medium text-accent">
                去訓練
              </Link>
              <Link href="/me/settings" className="text-sm font-medium text-muted">
                設定
              </Link>
            </div>
          </Card>
        )}

        {mode === 'ok' && snap && (
          <Card className="py-4 space-y-3 ring-1 ring-accent/25">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted mb-0.5">{snap.displayName}</p>
                <CardTitle className="text-xl leading-snug">{snap.title}</CardTitle>
                {updatedLabel && (
                  <p className="mt-1 text-[11px] text-muted">更新於 {updatedLabel}</p>
                )}
              </div>
              <Badge tone="accent" className="shrink-0">
                {snap.trainedDays}/7 日
              </Badge>
            </div>
            <ul className="space-y-2">
              {snap.lines.map((line, i) => (
                <li key={i} className="text-sm text-muted leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-2xl bg-surface-muted px-3 py-2.5">
                <div className="text-[10px] text-muted">場數</div>
                <div className="text-lg font-semibold tabular-nums">{snap.sessions}</div>
              </div>
              <div className="rounded-2xl bg-surface-muted px-3 py-2.5">
                <div className="text-[10px] text-muted">容量</div>
                <div className="text-lg font-semibold tabular-nums">
                  {Math.round(snap.volume).toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-muted px-3 py-2.5">
                <div className="text-[10px] text-muted">蛋白均</div>
                <div className="text-lg font-semibold tabular-nums">{snap.proteinAvg}g</div>
              </div>
            </div>
            <p className="text-[10px] text-muted leading-relaxed">
              Snapshot 分享 · 非即時同步。想自己開牆？去「我 → 設定」。
            </p>
          </Card>
        )}

        <p className="text-center text-[11px] text-muted">
          <Link href="/" className="text-accent font-medium">
            Talk tgt la
          </Link>
        </p>
      </PageTransition>
    </AppShell>
  )
}
