'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageCircle, Dumbbell, Utensils, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springSoft } from '@/components/motion/presets'

const items = [
  { href: '/', label: '傾偈', icon: MessageCircle },
  { href: '/train', label: '訓練', icon: Dumbbell },
  { href: '/eat', label: '飲食', icon: Utensils },
  { href: '/me', label: '我', icon: User },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile bottom */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
        aria-label="主導航"
      >
        <ul className="grid grid-cols-4 h-[var(--nav-h)] max-w-lg mx-auto px-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                    active ? 'text-accent' : 'text-muted hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-3 top-2 bottom-2 rounded-2xl bg-accent-soft"
                      transition={springSoft}
                    />
                  )}
                  <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="relative z-10 font-medium">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Desktop side */}
      <nav
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[88px] flex-col items-center border-r border-border bg-surface/95 backdrop-blur-md py-8 gap-2"
        aria-label="主導航"
      >
        <div className="mb-6 font-serif text-lg text-accent tracking-tight">tgt</div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex w-[64px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] transition-colors',
                active ? 'text-accent' : 'text-muted hover:text-foreground hover:bg-black/[0.03]'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill-desktop"
                  className="absolute inset-0 rounded-2xl bg-accent-soft"
                  transition={springSoft}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="relative z-10 font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
