'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Cloud, Dumbbell, Flame, MessageCircle, Target, Utensils } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageSkeleton } from '@/components/ui/skeleton'
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
import { computeStreak, trainedToday, weekConsistency, type WeekDay } from '@/lib/fitness/streaks'
import { WeekDots } from '@/components/fitness/week-dots'

export function MeClient() {
  const { ready: authReady, user, configured, signOut } = useUser()
  const search = useSearchParams()
  const [goals, setGoals] = useState<FitnessGoals>({ proteinG: 150, kcal: 2200 })
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [didTrain, setDidTrain] = useState(false)
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekCount, setWeekCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [mealCount, setMealCount] = useState(0)
  const authError = search.get('auth') === 'error'

  useEffect(() => {
    setGoals(loadGoals())
    const sessions = loadSessions()
    const meals = loadMeals()
    setStreak(computeStreak(sessions))
    setDidTrain(trainedToday())
    const w = weekConsistency(sessions)
    setWeekDays(w.days)
    setWeekCount(w.trainedCount)
    setSessionCount(sessions.filter((s) => s.endedAt).length)
    setMealCount(meals.length)
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
          setSyncNote(`本機資料已上雲：${w} 次訓練、${m} 餐`)
        }
      } catch (e) {
        if (!cancelled) {
          setSyncNote(e instanceof Error ? e.message : 'sync 唔到')
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
        <PageSkeleton />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageTransition className="max-w-lg mx-auto">
        <PageHeader
          eyebrow="我"
          title={user ? '跟住你走' : '試玩中'}
          description={
            user
              ? '訓練同飲食上雲，換機都睇到。目標同方案都喺呢度。'
              : '訪客資料淨係留喺呢部機。登入之後上雲，仲可以睇齊日／週／月。'
          }
        />

        {authError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            登入連結失效或者跳轉未設好。返嚟「我」再寄一次，或者填 6 位碼；又或者試 Google。
          </div>
        )}

        <Stagger className="space-y-5">
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
            <Card className="py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  <CardTitle className="text-lg">呢個星期</CardTitle>
                </div>
                <Badge tone={weekCount > 0 ? 'accent' : 'muted'}>
                  {weekCount}/7 日
                </Badge>
              </div>
              <WeekDots days={weekDays} />
              <p className="mt-3 text-[11px] text-muted leading-relaxed">
                {streak > 0
                  ? `連練 ${streak} 日${didTrain ? ' · 今日已打卡' : ' · 今日未開波，去訓練維持'}。`
                  : didTrain
                    ? '今日打咗卡——聽日再嚟就開始連練。'
                    : '練完一日就會喺度亮；唔使日日爆機，一星期一兩日都得。'}
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div className="grid grid-cols-3 gap-3">
              <Card className="py-3.5 px-3">
                <div className="text-[10px] text-muted mb-1">連練</div>
                <div className="text-xl font-semibold tabular-nums text-accent">{streak}</div>
                <div className="text-[10px] text-muted">日</div>
              </Card>
              <Card className="py-3.5 px-3">
                <div className="text-[10px] text-muted mb-1">訓練</div>
                <div className="text-xl font-semibold tabular-nums">{sessionCount}</div>
                <div className="text-[10px] text-muted">次</div>
              </Card>
              <Card className="py-3.5 px-3">
                <div className="text-[10px] text-muted mb-1">飲食</div>
                <div className="text-xl font-semibold tabular-nums">{mealCount}</div>
                <div className="text-[10px] text-muted">餐</div>
              </Card>
            </div>
          </StaggerItem>

          {!user && (
            <StaggerItem>
              <div className="rounded-2xl border border-dashed border-border bg-[#fafaf9] px-4 py-3.5 text-xs text-muted leading-relaxed">
                上面數字而家淨係本機。登入之後會上雲，換手機都跟住你。
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
                <CardTitle className="text-xl">今日想食幾多</CardTitle>
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
                  {saved ? <span className="success-pop">存好喇 ✓</span> : '儲低目標'}
                </Button>
              </div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div className="grid grid-cols-3 gap-3">
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
              Talk tgt la · 你嘅訓練同飲食，淨得你睇到。
            </CardDesc>
          </StaggerItem>
        </Stagger>
      </PageTransition>
    </AppShell>
  )
}
