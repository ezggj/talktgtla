import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { HkGymCompare } from '@/components/fitness/hk-gym-compare'

export const metadata = {
  title: '香港健身房對比 · Talk tgt la',
  description: '想 join 邊間？按地區、價錢、24 小時同器材對比——價錢僅供參考。',
}

export default function MeGymsPage() {
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
          eyebrow="香港"
          title="健身房對比"
          description="想 join 邊間？按地區、價錢、24 小時同器材篩一篩。價錢同資料僅供參考，以會所官方為準。"
        />
        <Suspense
          fallback={
            <div className="h-48 rounded-[20px] bg-border/40 skeleton-pulse" />
          }
        >
          <HkGymCompare />
        </Suspense>
        <p className="mt-3 text-center text-[10px] text-muted leading-relaxed px-2">
          靜態整理可能過時；標「參考 · 非報價」。{' '}
          <Link href="/disclaimer" className="text-accent font-medium hover:underline">
            免責聲明
          </Link>
        </p>
      </PageTransition>
    </AppShell>
  )
}
