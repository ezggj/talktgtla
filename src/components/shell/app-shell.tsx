'use client'

import { BottomNav } from './bottom-nav'
import { ThemeBootstrap } from './theme-bootstrap'
import { AppMenu } from './app-menu'
import { FeedbackSheet } from '@/components/feedback/feedback-sheet'
import { cn } from '@/lib/utils'

export function AppShell({
  children,
  className,
  flush = false,
}: {
  children: React.ReactNode
  className?: string
  /** Chat uses full-height flex; skip default page padding */
  flush?: boolean
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-clip">
      <ThemeBootstrap />
      {/* Persistent top-right hamburger — sticky reserves space on tab pages */}
      <div
        className={cn(
          'z-40 flex justify-end pointer-events-none',
          flush
            ? 'fixed top-[max(0.65rem,env(safe-area-inset-top))] right-3 md:right-6'
            : 'sticky top-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 bg-background/75 backdrop-blur-md md:pl-[calc(88px+0.75rem)]'
        )}
      >
        <div className="pointer-events-auto">
          <AppMenu />
        </div>
      </div>
      <div
        className={cn(
          'md:pl-[88px]',
          flush
            ? 'pb-[calc(var(--nav-h)+var(--safe-bottom))] md:pb-0'
            : 'px-4 pt-3 pb-[calc(var(--nav-h)+1.5rem+var(--safe-bottom))] sm:px-5 md:px-10 md:pt-6 md:pb-12',
          className
        )}
      >
        {children}
      </div>
      <FeedbackSheet fab />
      <BottomNav />
    </div>
  )
}
