import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { HkGymCompare } from '@/components/fitness/hk-gym-compare'

export const metadata = {
  title: '香港健身房對比 · Talk tgt la',
  description: '按地區、價錢、24小時同器材，對比香港常見健身房——僅供參考。',
}

export default function MeGymsPage() {
  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto">
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返「我」
        </Link>
        <PageHeader
          eyebrow="揀場"
          title="香港健身房對比"
          description="想 join 邊間？按地區、價錢、廿四小時同器材篩一篩，最多並排三間。價錢係大約參考，唔當報價。"
        />
        <HkGymCompare />
      </PageTransition>
    </AppShell>
  )
}
