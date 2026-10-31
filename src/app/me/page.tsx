import { Suspense } from 'react'
import { MeClient } from './me-client'

export const metadata = {
  title: '我 · Talk tgt la',
  description: '個人目標同帳戶',
}

function MeFallback() {
  return (
    <div className="min-h-dvh bg-background px-4 pt-10 max-w-lg mx-auto space-y-4">
      <div className="h-10 w-32 rounded-2xl bg-border/70 skeleton-pulse" />
      <div className="h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
    </div>
  )
}

export default function MePage() {
  return (
    <Suspense fallback={<MeFallback />}>
      <MeClient />
    </Suspense>
  )
}
