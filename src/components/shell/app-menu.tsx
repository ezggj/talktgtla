'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  FileText,
  LogIn,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { useUser } from '@/lib/auth/use-user'
import {
  resolveTheme,
  setThemePreference,
  type ThemeMode,
} from '@/lib/theme'
import { OPEN_FEEDBACK_EVENT } from '@/lib/ui-events'
import { cn } from '@/lib/utils'

export function openFeedbackSheet() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT))
}

/** 右上角三橫選單 — 設定同常用入口 */
export function AppMenu({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduce = useReducedMotion()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const { ready, user, signOut } = useUser()

  // Hide on admin
  const hide = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    setThemeMode(resolveTheme())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    // Close when route changes
    setOpen(false)
  }, [pathname])

  const close = useCallback(() => setOpen(false), [])

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
    setThemePreference(next)
  }

  const go = (href: string) => {
    close()
    router.push(href)
  }

  if (hide) return null

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label="選單"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
          'border border-border/90 bg-surface/95 text-foreground shadow-soft backdrop-blur-md',
          'hover:bg-accent-soft/70 hover:border-accent/30 touch-manipulation transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35'
        )}
      >
        {open ? (
          <X className="h-[18px] w-[18px]" aria-hidden />
        ) : (
          <Menu className="h-[18px] w-[18px]" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="關閉選單"
              className="fixed inset-0 z-[45] bg-black/25 backdrop-blur-[2px]"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              id={titleId}
              role="menu"
              aria-label="選單"
              className={cn(
                'fixed z-[50] w-[min(100vw-1.5rem,17.5rem)]',
                'right-3 top-[calc(max(0.65rem,env(safe-area-inset-top))+2.75rem)]',
                'md:right-6',
                'overflow-hidden rounded-[20px] border border-border bg-surface shadow-hover'
              )}
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springSoft}
            >
              <div className="border-b border-border px-3.5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  Talk tgt la
                </p>
                <p className="mt-0.5 font-serif text-base tracking-tight text-foreground">
                  快捷選單
                </p>
              </div>

              <div className="p-1.5">
                <MenuItem
                  icon={Settings}
                  label="設定"
                  hint="主題 · 通知 · 字體"
                  onClick={() => go('/me/settings')}
                />
                <MenuItem
                  icon={themeMode === 'dark' ? Sun : Moon}
                  label={themeMode === 'dark' ? '轉淺色' : '轉深色'}
                  hint="一掣切換"
                  onClick={toggleTheme}
                />
                <MenuItem
                  icon={MessageSquarePlus}
                  label="畀意見"
                  hint="提議 · 壞咗 · 讚好"
                  onClick={() => {
                    close()
                    openFeedbackSheet()
                  }}
                />
                <MenuItem
                  icon={FileText}
                  label="免責聲明"
                  onClick={() => go('/disclaimer')}
                />

                {ready ? (
                  user ? (
                    <MenuItem
                      icon={LogOut}
                      label="登出"
                      hint={user.email ?? undefined}
                      danger
                      onClick={() => {
                        close()
                        void signOut()
                      }}
                    />
                  ) : (
                    <MenuItem
                      icon={LogIn}
                      label="登入"
                      hint="同步訓練同飲食"
                      onClick={() => go('/me')}
                    />
                  )
                ) : null}
              </div>

              <div className="border-t border-border px-3.5 py-2.5">
                <Link
                  href="/me/settings"
                  role="menuitem"
                  onClick={close}
                  className="text-[11px] font-medium text-accent hover:underline"
                >
                  全部設定 →
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: typeof Settings
  label: string
  hint?: string
  onClick: () => void
  danger?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left touch-manipulation transition-colors',
        'hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        danger && 'hover:bg-danger/10'
      )}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={springSnappy}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background',
          danger ? 'text-danger' : 'text-accent'
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold leading-tight',
            danger ? 'text-danger' : 'text-foreground'
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted leading-tight">
            {hint}
          </span>
        ) : null}
      </span>
    </motion.button>
  )
}
