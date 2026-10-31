'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Dumbbell, LogIn, MessageCircle, Target, Utensils } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { loadGoals, saveGoals, type FitnessGoals } from '@/lib/fitness/storage'

export function MeClient() {
  const [goals, setGoals] = useState<FitnessGoals>({ proteinG: 150, kcal: 2200 })
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setGoals(loadGoals())
    setReady(true)
  }, [])

  const persist = () => {
    saveGoals(goals)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  if (!ready) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto space-y-4 pt-8">
          <div className="h-10 w-32 rounded-2xl bg-border/70 skeleton-pulse" />
          <div className="h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted mb-2">我</p>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">你嘅空間</h1>
          <p className="mt-2 text-sm text-muted">
            目標可以而家改。會員登入稍後接上——資料暫時存在呢部機。
          </p>
        </header>

        <Stagger className="space-y-4">
          <StaggerItem>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-soft),_transparent_60%)] pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone="accent">即將推出</Badge>
                </div>
                <CardTitle className="text-xl mb-2">登入同步</CardTitle>
                <CardDesc className="mb-5">
                  之後可以用電郵／Google 登入，訓練同飲食會跟住你跨裝置。而家先用本機資料，唔會唔見喺呢部電話。
                </CardDesc>
                <Button variant="secondary" disabled className="opacity-70">
                  <LogIn className="h-4 w-4" />
                  登入（準備中）
                </Button>
              </div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-accent" />
                <CardTitle className="text-xl">今日目標</CardTitle>
              </div>
              <div className="space-y-3">
                <label className="block text-xs text-muted">
                  蛋白 (g)
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={goals.proteinG}
                    onChange={(e) =>
                      setGoals((g) => ({ ...g, proteinG: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
                <label className="block text-xs text-muted">
                  卡路里 (kcal)
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={goals.kcal}
                    onChange={(e) =>
                      setGoals((g) => ({ ...g, kcal: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
                <Button onClick={persist} className="w-full">
                  {saved ? '已儲存 ✓' : '儲存目標'}
                </Button>
              </div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { href: '/', label: '傾偈', icon: MessageCircle },
                  { href: '/train', label: '訓練', icon: Dumbbell },
                  { href: '/eat', label: '飲食', icon: Utensils },
                ] as const
              ).map(({ href, label, icon: Icon }) => (
                <motion.div key={href} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springSnappy}>
                  <Link
                    href={href}
                    className="flex flex-col items-center gap-2 rounded-[20px] border border-border bg-surface py-5 shadow-soft hover:shadow-hover transition"
                  >
                    <Icon className="h-5 w-5 text-accent" />
                    <span className="text-xs font-medium">{label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </StaggerItem>

          <StaggerItem>
            <p className="text-[11px] text-muted text-center leading-relaxed px-4 pt-2">
              Talk tgt la · 香港 gym 人嘅傾偈同工具。訓練／飲食資料暫存本機；上線 Auth 後會遷移。
            </p>
          </StaggerItem>
        </Stagger>
      </PageTransition>
    </AppShell>
  )
}
