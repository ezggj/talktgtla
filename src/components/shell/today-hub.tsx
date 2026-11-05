'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dumbbell, MessageCircle, Utensils, Flame, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { NewbieGuide } from '@/components/shell/newbie-guide'
import { PageTransition } from '@/components/motion/page-transition'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { dismissWelcome, isWelcomeDismissed } from '@/lib/client-progress'
import { getDailyTopic, topicStarterLine } from '@/lib/fitness/daily-topic'
import {
  isSameDay,
  isWorkingSet,
  loadActiveSession,
  loadGoals,
  loadMeals,
  loadSessions,
  todayKey,
  type MealEntry,
  type WorkoutSession,
} from '@/lib/fitness/storage'
import { proteinThatCounts } from '@/lib/fitness/protein-count'
import { computeStreak, trainedToday } from '@/lib/fitness/streaks'
import { TEMPLATES } from '@/lib/fitness/exercises'
import { cn } from '@/lib/utils'

const DEMO_LEG = TEMPLATES.find((t) => t.id === 'newbie-leg-day') || TEMPLATES.find((t) => t.id === 'fullbody')

function lastFinished(sessions: WorkoutSession[]): WorkoutSession | null {
  return sessions.find((s) => s.endedAt && s.sets.length > 0) || null
}

function lastFinishedLine(sessions: WorkoutSession[]): string | null {
  const s = lastFinished(sessions)
  if (!s) return null
  const name = TEMPLATES.find((t) => t.id === s.templateId)?.name || '自由練'
  const sets = s.sets.filter(isWorkingSet).length
  const when = new Date(s.endedAt || s.startedAt)
  const day =
    todayKey(when) === todayKey()
      ? '今日'
      : when.toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })
  return `${day} · ${name} · ${sets} 組`
}

export function TodayHub() {
  const router = useRouter()
  const search = useSearchParams()
  const fromThreads = search.get('from') === 'threads'
  const [ready, setReady] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [protein, setProtein] = useState(0)
  const [kcal, setKcal] = useState(0)
  const [proteinGoal, setProteinGoal] = useState(150)
  const [mealCount, setMealCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [didTrain, setDidTrain] = useState(false)
  const [lastLine, setLastLine] = useState<string | null>(null)
  const [hasHistory, setHasHistory] = useState(false)
  const [activeLive, setActiveLive] = useState(false)
  const [topic, setTopic] = useState({
    emoji: '🏋️',
    title: '今日去邊間 gym？',
    hint: '',
    key: '',
  })
  const [greeting, setGreeting] = useState('你好')
  const [hour, setHour] = useState(12)

  useEffect(() => {
    const meals = loadMeals()
    const goals = loadGoals()
    const sessions = loadSessions()
    const todayMeals = meals.filter((m: MealEntry) => isSameDay(m.createdAt))
    setProtein(Math.round(proteinThatCounts(todayMeals)))
    setKcal(Math.round(todayMeals.reduce((sum, m) => sum + (m.macros.kcal || 0), 0)))
    setProteinGoal(goals.proteinG)
    setMealCount(todayMeals.length)
    setStreak(computeStreak(sessions))
    setDidTrain(trainedToday())
    setLastLine(lastFinishedLine(sessions))
    setHasHistory(Boolean(lastFinished(sessions)))
    const active = loadActiveSession()
    setActiveLive(Boolean(active && !active.endedAt))
    setTopic(getDailyTopic())
    const h = new Date().getHours()
    setHour(h)
    setGreeting(
      h < 11 ? '早晨' : h < 14 ? '午安' : h < 18 ? '下晝好' : h < 22 ? '晚上好' : '夜啦'
    )
    // Threads visitors: skip long guide; mark welcome done so we don't nag later
    if (fromThreads) {
      dismissWelcome()
      setShowGuide(false)
    } else {
      setShowGuide(!isWelcomeDismissed())
    }
    setReady(true)
  }, [fromThreads])

  const closeGuide = () => {
    dismissWelcome()
    setShowGuide(false)
  }

  const proteinPct = proteinGoal > 0 ? Math.min(100, Math.round((protein / proteinGoal) * 100)) : 0
  const proteinGap = Math.max(0, proteinGoal - protein)
  const showProteinChip =
    ready && proteinGap >= 20 && (mealCount === 0 || hour >= 17 || proteinPct < 70)
  const showDemo = ready && !hasHistory && !activeLive && !didTrain
  const showReplay = ready && hasHistory && !activeLive

  const demoHref = useMemo(() => {
    if (!DEMO_LEG) return '/train'
    return `/train?template=${DEMO_LEG.id}`
  }, [])

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <header className="mb-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted mb-1">
            Talk tgt la · 今日
          </p>
          <h1 className="font-serif text-[1.75rem] sm:text-[2rem] tracking-tight leading-tight">
            {fromThreads
              ? '免費記組 · 唔使裝 app'
              : `${greeting}——練完／食完一掣記`}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted leading-relaxed max-w-md">
            {fromThreads
              ? '一掣開示範腿日，約五分鐘感受記組。港式飲食都喺度。'
              : '免費記組同港式飲食。想傾先入房都得。'}
          </p>
        </header>

        {fromThreads && showDemo ? (
          <Link
            href={demoHref}
            className={cn(
              'mb-4 flex items-center gap-3 rounded-[20px] border px-4 py-4 shadow-soft transition touch-manipulation',
              'border-accent/40 bg-gradient-to-br from-accent-soft via-surface to-surface ring-1 ring-accent/25',
              'hover:shadow-hover active:scale-[0.99]'
            )}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-lg leading-tight">試做示範腿日（約 5 分鐘）</span>
              <span className="mt-0.5 block text-[12px] text-muted leading-snug">
                預填動作 · 一掣開波 · 唔使註冊
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          </Link>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-soft">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
              <Flame className="h-3 w-3" aria-hidden />
              連續
            </div>
            <p className="mt-1 font-serif text-xl tabular-nums leading-none">
              {ready ? streak : '—'}
              <span className="ml-1 text-sm font-sans font-medium text-muted">日</span>
            </p>
            <p className="mt-1.5 text-[11px] text-muted leading-snug">
              {!ready
                ? '載入中…'
                : didTrain
                  ? '今日已練 ✓'
                  : activeLive
                    ? '仲有場練緊'
                    : lastLine || '今日未開波'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-soft">
            <div className="text-[10px] font-semibold text-accent">今日蛋白</div>
            <p className="mt-1 font-serif text-xl tabular-nums leading-none">
              {ready ? protein : '—'}
              <span className="ml-1 text-sm font-sans font-medium text-muted">/{proteinGoal}g</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${ready ? proteinPct : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted tabular-nums">
              {ready ? (mealCount > 0 ? `${mealCount} 餐 · ${kcal} kcal` : '未記餐') : '…'}
            </p>
          </div>
        </div>

        {showProteinChip ? (
          <Link
            href="/eat?focus=protein"
            className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2.5 text-[12px] text-amber-950 touch-manipulation hover:brightness-[0.98] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <span>
              蛋白仲差 <strong className="font-semibold tabular-nums">{proteinGap}g</strong>
              <span className="text-muted dark:text-amber-100/70"> · 港式快加</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </Link>
        ) : null}

        <div className="space-y-2.5 mb-4">
          <Link
            href="/train"
            className={cn(
              'flex items-center gap-3 rounded-[20px] border px-4 py-4 shadow-soft transition touch-manipulation',
              'border-accent/35 bg-gradient-to-br from-accent-soft/80 via-surface to-surface ring-1 ring-accent/20',
              'hover:shadow-hover active:scale-[0.99]'
            )}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
              <Dumbbell className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-lg leading-tight">
                {activeLive ? '繼續訓練' : '開波訓練'}
              </span>
              <span className="mt-0.5 block text-[12px] text-muted leading-snug">
                {activeLive ? '返去記組' : '記重量同次數——完場可以分享 Threads'}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          </Link>

          {showDemo && !fromThreads ? (
            <Link
              href={demoHref}
              className="flex items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5 shadow-soft transition touch-manipulation hover:shadow-hover active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">
                  試做示範腿日（約 5 分鐘）
                </span>
                <span className="mt-0.5 block text-[11px] text-muted leading-snug">
                  預填動作 · 一掣體驗成功 · 唔使註冊
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : null}

          {showReplay ? (
            <Link
              href="/train?replay=1"
              className="flex items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5 shadow-soft transition touch-manipulation hover:shadow-hover active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground">
                <RotateCcw className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">再做呢場</span>
                <span className="mt-0.5 block text-[11px] text-muted leading-snug line-clamp-1">
                  {lastLine || '照上一場動作同重量'}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : null}

          <Link
            href="/eat"
            className="flex items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-4 shadow-soft transition touch-manipulation hover:shadow-hover active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Utensils className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-lg leading-tight">記一餐</span>
              <span className="mt-0.5 block text-[12px] text-muted leading-snug">
                港式快加／影餐——叉燒飯、譚仔一掣加
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          </Link>

          <Link
            href="/chat"
            className="flex items-center gap-3 rounded-[20px] border border-dashed border-border/90 bg-surface/80 px-4 py-3.5 transition touch-manipulation hover:bg-surface hover:border-border active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-muted">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">入房傾兩句</span>
              <span className="mt-0.5 block text-[11px] text-muted leading-snug line-clamp-1">
                {topic.emoji} {topic.title}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </Link>
        </div>

        <div className="mb-4">
          <InstallPrompt variant="banner" eager className="shadow-soft" />
        </div>

        <div className="rounded-[20px] border border-border bg-surface p-4 shadow-soft mb-4">
          <p className="text-[10px] font-semibold tracking-wide text-accent mb-1">今日話題</p>
          <p className="font-serif text-lg leading-snug">
            {topic.emoji} {topic.title}
          </p>
          {topic.hint ? (
            <p className="mt-1 text-[12px] text-muted leading-relaxed">{topic.hint}</p>
          ) : null}
          <Link
            href="/chat?topic=1"
            className="mt-3 inline-flex h-9 items-center rounded-xl bg-accent-soft px-3.5 text-xs font-medium text-accent touch-manipulation hover:brightness-95"
          >
            {topicStarterLine(getDailyTopic())} · 去講
          </Link>
        </div>

        <p className="text-center text-[11px] text-muted leading-relaxed px-2">
          唔使帳戶都可以用。登入先至同步去雲。
        </p>
      </PageTransition>

      <NewbieGuide
        open={showGuide}
        onClose={closeGuide}
        onStart={() => {
          closeGuide()
          router.push(showDemo ? demoHref : '/train')
        }}
        onEat={() => {
          closeGuide()
          router.push('/eat')
        }}
        onChat={() => {
          closeGuide()
          router.push('/chat')
        }}
      />
    </AppShell>
  )
}
