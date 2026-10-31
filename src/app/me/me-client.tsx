'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Cloud, Dumbbell, MessageCircle, Target, Utensils } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoginCard } from '@/components/auth/login-card'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import {
  loadGoals,
  saveGoals,
  loadSessions,
  loadMeals,
  type FitnessGoals,
} from '@/lib/fitness/storage'
import {
  fetchProfile,
  upsertGoals,
  migrateLocalWorkouts,
  migrateLocalMeals,
} from '@/lib/fitness/cloud'
import { PlanGenerator } from '@/components/fitness/plan-generator'

export function MeClient() {
  const { ready: authReady, user, configured, signOut } = useUser()
  const search = useSearchParams()
  const [goals, setGoals] = useState<FitnessGoals>({ proteinG: 150, kcal: 2200 })
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const authError = search.get('auth') === 'error'

  useEffect(() => {
    setGoals(loadGoals())
    setReady(true)
  }, [])

  // Load profile + migrate local → cloud once logged in
  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const profile = await fetchProfile(supabase, user.id)
        if (cancelled) return
        if (profile) {
          const g = { proteinG: profile.protein_goal, kcal: profile.calorie_goal }
          setGoals(g)
          saveGoals(g)
        } else {
          await upsertGoals(supabase, user.id, loadGoals())
        }
        const w = await migrateLocalWorkouts(supabase, user.id, loadSessions())
        const m = await migrateLocalMeals(supabase, user.id, loadMeals())
        if (!cancelled && (w > 0 || m > 0)) {
          setSyncNote(`已上載本機資料：${w} 次訓練、${m} 餐`)
        }
      } catch (e) {
        if (!cancelled) {
          setSyncNote(e instanceof Error ? e.message : '同步失敗')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  const persist = async () => {
    saveGoals(goals)
    if (user) {
      try {
        const supabase = createClient()
        await upsertGoals(supabase, user.id, goals)
      } catch {
        /* local already saved */
      }
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  if (!ready || !authReady) {
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
            登入之後訓練同飲食上雲；飲食可以隨時翻睇日／週／月蛋白同卡路里。
          </p>
        </header>

        {authError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            登入連結失效或者 redirect 未設定。請喺「我」再寄一次，或者用 6 位碼。
          </div>
        )}

        <Stagger className="space-y-4">
          <StaggerItem>
            <LoginCard user={user} configured={configured} onSignOut={signOut} />
          </StaggerItem>

          {syncNote && (
            <StaggerItem>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted">
                <Cloud className="h-3.5 w-3.5 text-accent shrink-0" />
                {syncNote}
              </div>
            </StaggerItem>
          )}

          <StaggerItem>
            <PlanGenerator userId={user?.id ?? null} />
          </StaggerItem>

          <StaggerItem>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-accent" />
                <CardTitle className="text-xl">今日目標</CardTitle>
                {user && <Badge tone="muted">雲端</Badge>}
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
                <Button onClick={() => void persist()} className="w-full">
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
                <motion.div
                  key={href}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnappy}
                >
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
            <CardDesc className="text-center text-[11px] px-2">
              Talk tgt la · 會員 Auth 同管理員 /admin 分開。資料 RLS 鎖死只得你睇到。
            </CardDesc>
          </StaggerItem>
        </Stagger>
      </PageTransition>
    </AppShell>
  )
}
