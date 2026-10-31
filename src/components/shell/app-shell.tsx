'use client'

import { BottomNav } from './bottom-nav'
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
      <div
        className={cn(
          'md:pl-[88px]',
          flush
            ? 'pb-[calc(var(--nav-h)+var(--safe-bottom))] md:pb-0'
            : 'px-4 pt-6 pb-[calc(var(--nav-h)+1.5rem+var(--safe-bottom))] sm:px-5 md:px-10 md:pt-10 md:pb-12',
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
