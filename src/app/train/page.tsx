import { Suspense } from 'react'
import { TrainClient } from './train-client'

export const metadata = {
  title: '訓練 · Talk tgt la',
  description: '記組數、重量、時間——香港 gym 人嘅訓練日誌',
}

function TrainFallback() {
  return (
    <div className="min-h-dvh bg-background px-4 pt-10 max-w-2xl mx-auto space-y-4">
      <div className="h-10 w-40 rounded-2xl bg-border/70 skeleton-pulse" />
      <div className="h-32 rounded-[20px] bg-border/50 skeleton-pulse" />
      <div className="h-48 rounded-[20px] bg-border/40 skeleton-pulse" />
    </div>
  )
}

export default function TrainPage() {
  return (
    <Suspense fallback={<TrainFallback />}>
      <TrainClient />
    </Suspense>
  )
}
