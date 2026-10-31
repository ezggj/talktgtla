import { Suspense } from 'react'
import type { Metadata } from 'next'
import { WallClient } from './wall-client'

export const metadata: Metadata = {
  title: '訓練牆 · Talk tgt la',
  description: '公開一週訓練／飲食摘要（可關）',
}

export default async function WallPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background p-6">
          <div className="max-w-lg mx-auto h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
        </div>
      }
    >
      <WallClient slug={slug} />
    </Suspense>
  )
}
