import type { Metadata } from 'next'
import Link from 'next/link'
import { Dumbbell, Utensils, Share2 } from 'lucide-react'

export const metadata: Metadata = {
  title: '開始 · 免費記組',
  description: '免費記組 · 唔使裝 app。一掣開示範腿日，港式飲食都喺度。',
  openGraph: {
    title: 'Talk tgt la · 免費記組唔使裝 app',
    description: '一掣體驗記組 · 港式快加 · 完場分享 Threads',
    url: 'https://talktgtla.com/start?from=threads',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Talk tgt la' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Talk tgt la · 免費記組唔使裝 app',
    description: '一掣體驗記組 · 港式快加',
    images: ['/og.png'],
  },
}

/** Threads / share visitor landing — single CTA, no long guide */
export default function StartPage() {
  return (
    <main className="min-h-dvh bg-background px-4 pt-14 pb-16 max-w-md mx-auto">
      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-accent mb-2">
        Talk tgt la
      </p>
      <h1 className="font-serif text-[1.85rem] tracking-tight leading-tight">
        免費記組 · 唔使裝 app
      </h1>
      <p className="mt-2 text-[14px] text-muted leading-relaxed">
        香港 gym 人用嘅記組同港式飲食。撳一下就開波——唔使註冊。
      </p>

      <Link
        href="/train?template=newbie-leg-day"
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-[20px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-soft touch-manipulation active:scale-[0.99]"
      >
        <Dumbbell className="h-5 w-5" aria-hidden />
        試做示範腿日（約 5 分鐘）
      </Link>
      <p className="mt-2 text-center text-[11px] text-muted">預填動作 · 記一組就知點用</p>

      <div className="mt-6 grid gap-2">
        <Link
          href="/eat?focus=protein"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 touch-manipulation hover:bg-surface-muted/60"
        >
          <Utensils className="h-4 w-4 text-accent shrink-0" aria-hidden />
          <span className="text-sm font-medium">或者先記一餐 · 港式快加</span>
        </Link>
        <Link
          href="/?from=threads"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3.5 touch-manipulation hover:bg-surface"
        >
          <Share2 className="h-4 w-4 text-muted shrink-0" aria-hidden />
          <span className="text-sm text-muted">睇今日總覽</span>
        </Link>
      </div>

      <ul className="mt-8 space-y-2 text-[12px] text-muted leading-relaxed">
        <li>· 記組、完場分享 Threads</li>
        <li>· 叉燒飯／譚仔一掣加蛋白</li>
        <li>· 資料留喺部機；登入先上雲</li>
      </ul>
    </main>
  )
}
