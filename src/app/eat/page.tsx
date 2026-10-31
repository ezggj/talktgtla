import { Suspense } from 'react'
import { EatClient } from './eat-client'

export const metadata = {
  title: '飲食 · Talk tgt la',
  description: '影餐估算卡路里同蛋白質——香港口味',
}

function EatFallback() {
  return (
    <div className="min-h-dvh bg-background px-4 pt-10 max-w-2xl mx-auto space-y-4">
      <div className="h-10 w-48 rounded-2xl bg-border/70 skeleton-pulse" />
      <div className="h-28 rounded-[20px] bg-border/50 skeleton-pulse" />
      <div className="h-40 rounded-[20px] bg-border/40 skeleton-pulse" />
    </div>
  )
}

export default function EatPage() {
  return (
    <Suspense fallback={<EatFallback />}>
      <EatClient />
    </Suspense>
  )
}
