import { Suspense } from 'react'
import { TodayHub } from '@/components/shell/today-hub'

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background px-4 pt-10 max-w-2xl mx-auto space-y-4">
          <div className="h-10 w-56 rounded-2xl bg-border/70 skeleton-pulse" />
          <div className="h-28 rounded-[20px] bg-border/50 skeleton-pulse" />
          <div className="h-24 rounded-[20px] bg-border/40 skeleton-pulse" />
        </div>
      }
    >
      <TodayHub />
    </Suspense>
  )
}
