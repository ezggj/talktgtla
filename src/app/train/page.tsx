import { Suspense } from 'react'
import { TrainClient } from './train-client'

export default function TrainPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background p-6">
          <div className="max-w-2xl mx-auto h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
        </div>
      }
    >
      <TrainClient />
    </Suspense>
  )
}
