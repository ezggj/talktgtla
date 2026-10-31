import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { DisclaimerFull } from '@/components/legal/site-disclaimer'
import { DISCLAIMER_TITLE } from '@/lib/legal/disclaimer'

export const metadata: Metadata = {
  title: DISCLAIMER_TITLE,
  description:
    'Talk tgt la 免責聲明——傾偈、訓練、飲食／AI 影餐、健身房比較、凑局同數據使用說明',
}

export default function DisclaimerPage() {
  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto pb-8">
        <Link
          href="/me"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent mb-3 touch-manipulation"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返「我」
        </Link>
        <PageHeader
          compact
          eyebrow="法律同使用"
          title={DISCLAIMER_TITLE}
          description="傾偈、訓練、飲食、會所、凑局"
        />
        <div className="rounded-[20px] border border-border bg-surface shadow-soft p-5">
          <DisclaimerFull />
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">
          <Link href="/me/settings" className="text-accent hover:underline">
            返設定
          </Link>
          {' · '}
          <Link href="/" className="text-accent hover:underline">
            返傾偈
          </Link>
        </p>
      </PageTransition>
    </AppShell>
  )
}
