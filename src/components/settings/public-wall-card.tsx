'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/fitness/share-card'
import { loadMeetupDisplayName } from '@/lib/fitness/meetups'
import {
  absolutePublicWallUrl,
  ensurePublicWallSlug,
  isPublicWallEnabled,
  refreshPublicWallSnapshot,
  rotatePublicWallSlug,
  setPublicWallEnabled,
} from '@/lib/fitness/public-wall'

export function PublicWallCard() {
  const [enabled, setEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refreshUrl = (on: boolean, nextSlug: string) => {
    if (!on || !nextSlug) {
      setUrl('')
      return
    }
    const name = loadMeetupDisplayName() || '街坊'
    const snap = refreshPublicWallSnapshot(name)
    setUrl(absolutePublicWallUrl(nextSlug, snap))
  }

  useEffect(() => {
    const on = isPublicWallEnabled()
    const s = on ? ensurePublicWallSlug() : getSlugSafe()
    setEnabled(on)
    setSlug(s)
    refreshUrl(on, s)
    setReady(true)
  }, [])

  function getSlugSafe() {
    try {
      return ensurePublicWallSlug()
    } catch {
      return ''
    }
  }

  const flash = (msg: string) => {
    setNote(msg)
    window.setTimeout(() => setNote(null), 2600)
  }

  if (!ready) return null

  return (
    <Card className="py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">公開訓練牆</CardTitle>
          <CardDesc className="mt-1">
            開咗可以分享一週訓練／蛋白摘要連結。預設關閉；關咗舊連結就當私人。
          </CardDesc>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => {
            const next = !enabled
            setPublicWallEnabled(next)
            const s = ensurePublicWallSlug()
            setEnabled(next)
            setSlug(s)
            refreshUrl(next, s)
            flash(next ? '已開公開訓練牆' : '已關閉——外人睇唔到你牆')
          }}
          className={
            enabled
              ? 'shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-white touch-manipulation'
              : 'shrink-0 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-muted touch-manipulation'
          }
        >
          {enabled ? '已開' : '已關'}
        </button>
      </div>

      {enabled && (
        <div className="space-y-2 rounded-2xl border border-border bg-surface-muted/60 px-3 py-2.5">
          <p className="text-[11px] text-muted break-all leading-relaxed">{url || '…'}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() => {
                void (async () => {
                  const name = loadMeetupDisplayName() || '街坊'
                  const snap = refreshPublicWallSnapshot(name)
                  const link = absolutePublicWallUrl(slug || ensurePublicWallSlug(), snap)
                  setUrl(link)
                  const ok = await copyText(link)
                  flash(ok ? '連結已複製（連一週摘要）' : '複製唔到')
                })()
              }}
            >
              複製分享連結
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const s = rotatePublicWallSlug()
                setSlug(s)
                refreshUrl(true, s)
                flash('已換新連結，舊嘅失效')
              }}
            >
              換新連結
            </Button>
            <Link
              href={url || `/wall/${slug}`}
              className="inline-flex h-9 items-center rounded-xl border border-border px-3.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent touch-manipulation"
            >
              預覽我嘅牆
            </Link>
          </div>
          <p className="text-[10px] text-muted leading-relaxed">
            呢條連結只係呢部機出嘅一週摘要，未有公開牆。
          </p>
        </div>
      )}

      {note && <p className="text-[11px] font-medium text-accent">{note}</p>}
    </Card>
  )
}
