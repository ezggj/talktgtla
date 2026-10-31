'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageSquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Textarea, Input } from '@/components/ui/input'
import { springSnappy, springSoft } from '@/components/motion/presets'
import { getOrCreateEatGuestId } from '@/lib/fitness/eat-guest-id'
import { OPEN_FEEDBACK_EVENT } from '@/lib/ui-events'
import { cn } from '@/lib/utils'

export type FeedbackCategory = 'idea' | 'bug' | 'love' | 'other'

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'idea', label: '提議' },
  { id: 'bug', label: '壞咗' },
  { id: 'love', label: '讚好' },
  { id: 'other', label: '其他' },
]

type Props = {
  /** Floating FAB (sitewide) */
  fab?: boolean
  /** Inline card (e.g. 我頁) */
  card?: boolean
  /** Prefill user id when logged in */
  userId?: string | null
  className?: string
}

export function FeedbackSheet({ fab = false, card = false, userId, className }: Props) {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [body, setBody] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Hide FAB on admin
  const hideFab = fab && (pathname?.startsWith('/admin') ?? false)

  const reset = useCallback(() => {
    setCategory('idea')
    setBody('')
    setContact('')
    setError('')
    setDone(false)
    setBusy(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Hamburger / external open
  useEffect(() => {
    if (!fab) return
    const onOpen = () => {
      reset()
      setOpen(true)
    }
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen)
  }, [fab, reset])

  const submit = async () => {
    const text = body.trim()
    if (text.length < 4) {
      setError('寫多少少啦（最少 4 個字）')
      return
    }
    setBusy(true)
    setError('')
    try {
      const guestId = getOrCreateEatGuestId()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          category,
          page: pathname || null,
          guestId,
          contact: contact.trim() || undefined,
          userId: userId || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : '交唔到，請再試')
        return
      }
      setDone(true)
      setBody('')
      setContact('')
    } catch {
      setError('網絡錯誤，請再試')
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <div className="space-y-3">
      {done ? (
        <div className="rounded-2xl bg-accent-soft/60 px-4 py-5 text-center">
          <p className="font-serif text-lg tracking-tight text-accent">收到！會睇，值得改就改</p>
          <p className="mt-1 text-xs text-muted">多謝你幫 Talk tgt la 好用啲</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              setDone(false)
              if (fab) setOpen(false)
            }}
          >
            {fab ? '收起' : '再講多句'}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition touch-manipulation',
                  category === c.id
                    ? 'bg-accent text-white shadow-soft'
                    : 'bg-[#f5f5f4] text-muted hover:bg-accent-soft hover:text-accent'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="有嘢想講？話我知點先好用…"
            rows={4}
            maxLength={2000}
            aria-labelledby={titleId}
          />
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="想跟進？留 email / IG（唔一定要）"
            maxLength={120}
            autoComplete="email"
          />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              {pathname ? `頁面 ${pathname}` : '全站'} · {body.trim().length}/2000
            </p>
            <Button
              type="button"
              size="sm"
              disabled={busy || body.trim().length < 4}
              onClick={() => void submit()}
            >
              {busy ? '交緊…' : '交意見'}
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {card ? (
        <Card className={cn(className)}>
          <div className="flex items-start gap-2 mb-3">
            <MessageSquarePlus className="h-4 w-4 text-accent mt-1 shrink-0" />
            <div>
              <CardTitle className="text-xl">
                <span id={titleId}>畀意見</span>
              </CardTitle>
              <CardDesc className="mt-1">有嘢想講？話我知點先好用。</CardDesc>
            </div>
          </div>
          {form}
        </Card>
      ) : null}

      {fab && !hideFab ? (
        <>
          <motion.button
            type="button"
            aria-label="畀意見"
            onClick={() => {
              if (!open) reset()
              setOpen((v) => !v)
            }}
            className={cn(
              'feedback-fab fixed right-3 z-30 md:right-6',
              'inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-surface/95 px-3.5 py-2.5',
              'text-xs font-medium text-accent shadow-hover backdrop-blur-md',
              'hover:bg-accent-soft/80 touch-manipulation'
            )}
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            transition={springSnappy}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            意見
          </motion.button>

          <AnimatePresence>
            {open ? (
              <>
                <motion.button
                  type="button"
                  aria-label="關閉"
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  className="feedback-fab-sheet fixed inset-x-3 z-50 mx-auto w-[min(100%,24rem)] rounded-[20px] border border-border bg-surface p-5 shadow-hover md:bottom-24 md:right-6 md:left-auto md:inset-x-auto md:mx-0"
                  initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={springSoft}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h2 id={titleId} className="font-serif text-xl tracking-tight">
                        畀意見
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">有嘢想講？話我知點先好用。</p>
                    </div>
                    <button
                      type="button"
                      aria-label="關閉"
                      onClick={() => setOpen(false)}
                      className="rounded-xl p-1.5 text-muted hover:bg-black/[0.04] hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {form}
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </>
  )
}
