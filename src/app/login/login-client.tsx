'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { PageSkeleton } from '@/components/ui/skeleton'
import { LoginCard } from '@/components/auth/login-card'
import { useUser } from '@/lib/auth/use-user'

/** Same six-digit email code as「我」. No magic link. */
export function LoginClient() {
  const { ready, user, configured, signOut } = useUser()

  if (!ready) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto">
        <Link
          href="/me"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent mb-3 touch-manipulation"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返「我」
        </Link>
        <PageHeader
          compact
          eyebrow="登入"
          title={user ? '已登入' : '六位數字登入'}
          description={
            user
              ? '訓練同飲食跟住呢個帳戶。'
              : '電郵會寄六位數字過嚟。填喺下面，唔使撳連結。'
          }
        />
        <LoginCard user={user} configured={configured} onSignOut={signOut} />
      </PageTransition>
    </AppShell>
  )
}
