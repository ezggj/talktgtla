import { Suspense } from 'react'
import { MeClient } from './me-client'

export default function MePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background p-6">
          <div className="max-w-lg mx-auto h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
        </div>
      }
    >
      <MeClient />
    </Suspense>
  )
}
