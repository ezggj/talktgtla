'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  Clock,
  Flame,
  History,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSoft, springSnappy, tabPanel } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress'
import { PageHeader } from '@/components/ui/page-header'
import { PageSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  EXERCISES,
  TEMPLATES,
  NEWBIE_QUICK_TEMPLATES,
  NEWBIE_SEARCH_CHIPS,
  exerciseById,
  matchedAliasLabel,
  searchExercises,
} from '@/lib/fitness/exercises'
import { ExerciseHowTo, ExerciseHowToHint } from '@/components/fitness/exercise-howto'
import {
  type WorkoutSession,
  type WorkoutSet,
  loadActiveSession,
  loadPRs,
  loadSessions,
  newId,
  saveActiveSession,
  savePRs,
  saveSessions,
  isSameDay,
  todayKey,
} from '@/lib/fitness/storage'
import { persistFinishedWorkout } from '@/lib/fitness/cloud'
import { migrateLocalFitnessToCloud } from '@/lib/fitness/migrate'
import { SyncToast } from '@/components/ui/sync-toast'
import { volumeByDay } from '@/lib/fitness/plan-progress'
import { GymNudgeCard } from '@/components/fitness/gym-nudge-card'
import { ShareCardButton } from '@/components/fitness/share-card-button'
import {
  evaluateFitnessAchievements,
  unlockFitnessAchievements,
  fitnessAchievementById,
  loadFitnessUnlocked,
} from '@/lib/fitness/achievements'
import { markTrainedToday, syncDaysFromSessions, weekConsistency, type WeekDay } from '@/lib/fitness/streaks'
import { WeekDots } from '@/components/fitness/week-dots'
import { TrainHeatmap } from '@/components/fitness/train-heatmap'
import { analyzeWorkout, formatDelta, type WorkoutAnalysis } from '@/lib/fitness/analysis'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import { buzzLight, notifyRestDone, flashDocumentTitle } from '@/lib/fitness/haptic'
import {
  DEFAULT_WEEKLY_PPL,
  SCHEDULE_PRESETS,
  applySchedulePreset,
  getTodayPlanHint,
  loadCustomDayPlans,
  loadWeeklySchedule,
  saveWeeklySchedule,
  saveTemplateAsCustom,
  deleteCustomDayPlan,
  type CustomDayPlan,
  type TodayPlanHint,
} from '@/lib/fitness/saved-plans'
import { ActivePlanPanel } from '@/components/fitness/active-plan-panel'
import { WeeklyPresets } from '@/components/fitness/weekly-presets'
import { CustomPlanBuilder } from '@/components/fitness/custom-plan-builder'
import { hydrateActivePlanFromCloud } from '@/lib/fitness/plan-store'
import {
  enqueueWorkout,
  flushOfflineQueue,
  offlineQueueCount,
} from '@/lib/fitness/offline-queue'
import { LoginPromptBanner } from '@/components/auth/login-card'
import { MeetupBoard } from '@/components/fitness/meetup-board'
import { TrainCoachCard } from '@/components/fitness/train-coach-card'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRest(sec: number) {
  if (sec <= 0) return '✓'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function volumeOf(sets: WorkoutSet[]) {
  return sets.reduce((a, s) => a + s.weightKg * s.reps, 0)
}

function lastSetForExercise(sessions: WorkoutSession[], exerciseId: string): WorkoutSet | null {
  for (const sess of sessions) {
    for (let i = sess.sets.length - 1; i >= 0; i--) {
      if (sess.sets[i].exerciseId === exerciseId) return sess.sets[i]
    }
  }
  return null
}

type Tab = 'today' | 'templates' | 'history' | 'meetup'

export function TrainClient() {
  const reduce = useReducedMotion()
  const { ready: authReady, user } = useUser()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [cloudNote, setCloudNote] = useState<string | null>(null)
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [active, setActive] = useState<WorkoutSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [prs, setPrs] = useState(loadPRs())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerHowtoId, setPickerHowtoId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(8)
  const [restSec, setRestSec] = useState(90)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restRunning, setRestRunning] = useState(false)
  const [prToast, setPrToast] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [lastFinished, setLastFinished] = useState<WorkoutSession | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<WorkoutAnalysis | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [planQueue, setPlanQueue] = useState<string[]>([])
  const [todayHint, setTodayHint] = useState<TodayPlanHint | null>(null)
  const [customPlans, setCustomPlans] = useState<CustomDayPlan[]>([])
  const [weekSlots, setWeekSlots] = useState(DEFAULT_WEEKLY_PPL)
  const [weekProgress, setWeekProgress] = useState<WeeklySlotProgress[]>([])
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [planRefreshKey, setPlanRefreshKey] = useState(0)
  const [achToast, setAchToast] = useState<string | null>(null)
  const weightRef = useRef<HTMLInputElement>(null)
  const repsRef = useRef<HTMLInputElement>(null)
  const loggerRef = useRef<HTMLDivElement>(null)
  const restEndedFocus = useRef(false)
  const [restReadyNext, setRestReadyNext] = useState(false)

  useEffect(() => {
    const s = loadSessions()
    setSessions(s)
    setPrs(loadPRs())
    const a = loadActiveSession()
    setActive(a)
    setReady(true)
  }, [])

  // Cloud hydrate + idempotent local → cloud migrate when logged in
  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const result = await migrateLocalFitnessToCloud(supabase, user.id)
        if (cancelled) return
        setSessions(result.workouts)
        syncDaysFromSessions(result.workouts)
        let note = result.note
        try {
          const flushed = await flushOfflineQueue(supabase, user.id)
          if (flushed.note) note = flushed.note
        } catch {
          /* ignore */
        }
        setCloudNote(note)
        if (result.workoutsUploaded > 0 || result.mealsUploaded > 0) {
          setSyncToast(result.note)
        }
      } catch (e) {
        if (!cancelled) setCloudNote(e instanceof Error ? e.message : '訓練 sync 唔到')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        await hydrateActivePlanFromCloud(supabase, user.id)
        if (!cancelled) setPlanRefreshKey((n) => n + 1)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  // Flush offline queue when back online / on login
  useEffect(() => {
    if (!user) return
    const flush = async () => {
      try {
        const supabase = createClient()
        const flushed = await flushOfflineQueue(supabase, user.id)
        if (flushed.note) setCloudNote(flushed.note)
      } catch {
        /* ignore */
      }
    }
    void flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [user])




  // One-tap start from workout plan (?exercises=id1,id2)
  useEffect(() => {
    if (!ready) return
    const raw = searchParams.get('exercises')
    const fromPlan = searchParams.get('plan')
    if (!raw) return
    const ids = raw.split(',').map((x) => x.trim()).filter(Boolean).filter((id) => !!exerciseById(id))
    if (ids.length === 0) return
    setPlanQueue(ids)
    const existing = loadActiveSession()
    if (existing && !existing.endedAt) {
      // Already mid-session — keep it, just seed the queue for quick switch
      setActive(existing)
      setTab('today')
      return
    }
    const sess: WorkoutSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      sets: [],
      templateId: fromPlan ? `plan:${fromPlan}` : 'plan',
    }
    saveActiveSession(sess)
    setActive(sess)
    setTab('today')
    const first = ids[0]
    if (first) {
      const last = lastSetForExercise(loadSessions(), first)
      setSelectedEx(first)
      setWeight(last?.weightKg ?? 40)
      setReps(last?.reps ?? 10)
    }
    // Clean query so refresh won't restart another session
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('exercises')
      url.searchParams.delete('plan')
      window.history.replaceState({}, '', url.pathname)
    } catch {
      /* ignore */
    }
  }, [ready, searchParams])

  useEffect(() => {
    if (!active?.startedAt || active.endedAt) return
    const tick = () => {
      const start = new Date(active.startedAt).getTime()
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [active])

  useEffect(() => {
    if (!restRunning || restLeft == null) return
    if (restLeft <= 0) {
      setRestRunning(false)
      setRestLeft(0)
      void notifyRestDone()
      flashDocumentTitle('休息完 · 下一組')
      setRestReadyNext(true)
      // Auto-jump: focus logger, ready for next set — no extra tap
      if (!restEndedFocus.current) {
        restEndedFocus.current = true
        window.setTimeout(() => {
          loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const el = weightRef.current
          if (el) {
            el.focus()
            el.select()
          }
          restEndedFocus.current = false
        }, 80)
        // Keep「休息完」可見耐啲，再收卡——banner 仍喺記組區
        window.setTimeout(() => {
          setRestLeft(null)
        }, 2800)
      }
      return
    }
    const id = window.setTimeout(() => setRestLeft((v) => (v == null ? v : v - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [restRunning, restLeft])

  const persistActive = useCallback((next: WorkoutSession | null) => {
    setActive(next)
    saveActiveSession(next)
  }, [])

  const startSession = (templateId?: string, exerciseIds?: string[]) => {
    const sess: WorkoutSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      sets: [],
      templateId,
    }
    persistActive(sess)
    setTab('today')
    if (exerciseIds?.length) {
      setPlanQueue(exerciseIds)
      pickExercise(exerciseIds[0], sess)
    } else {
      setPlanQueue([])
    }
  }

  const pickExercise = (exerciseId: string, sess = active) => {
    const ex = exerciseById(exerciseId)
    if (!ex) return
    setSelectedEx(exerciseId)
    setPickerOpen(false)
    setPickerHowtoId(null)
    setSearch('')
    const last = lastSetForExercise(
      [...(sess ? [sess] : []), ...sessions].filter(Boolean) as WorkoutSession[],
      exerciseId
    )
    if (last) {
      setWeight(last.weightKg)
      setReps(last.reps)
    } else {
      setWeight(40)
      setReps(10)
    }
  }

  /** One-tap：未開波就開波再揀；已開波就直接加入今日動作。 */
  const addToToday = (exerciseId: string) => {
    if (!exerciseById(exerciseId)) return
    if (!active) {
      const sess: WorkoutSession = {
        id: newId(),
        startedAt: new Date().toISOString(),
        sets: [],
        templateId: undefined,
      }
      persistActive(sess)
      setTab('today')
      setPlanQueue([])
      pickExercise(exerciseId, sess)
      return
    }
    pickExercise(exerciseId)
  }

  const addSet = () => {
    if (!active || !selectedEx) return
    const ex = exerciseById(selectedEx)
    if (!ex) return
    const setIndex = active.sets.filter((s) => s.exerciseId === selectedEx).length + 1
    const row: WorkoutSet = {
      id: newId(),
      exerciseId: selectedEx,
      exerciseName: ex.nameZh,
      setIndex,
      weightKg: weight,
      reps,
      restSec,
      completedAt: new Date().toISOString(),
    }
    const next = { ...active, sets: [...active.sets, row] }
    persistActive(next)

    // PR check: heaviest weight for exercise
    const prev = prs[selectedEx]
    const isPR = !prev || weight > prev.weightKg || (weight === prev.weightKg && reps > prev.reps)
    if (isPR && weight > 0) {
      const nextPrs = {
        ...prs,
        [selectedEx]: { weightKg: weight, reps, at: row.completedAt },
      }
      setPrs(nextPrs)
      savePRs(nextPrs)
      setPrToast(`${ex.nameZh} · ${weight} kg × ${reps}`)
      window.setTimeout(() => setPrToast(null), 2800)
    }

    setJustAdded(row.id)
    window.setTimeout(() => setJustAdded(null), 500)

    setRestLeft(restSec)
    setRestRunning(true)
    restEndedFocus.current = false
    setRestReadyNext(false)
    buzzLight()
  }

  const bumpWeight = (delta: number) => {
    setWeight((w) => Math.max(0, Math.round((w + delta) * 4) / 4))
  }

  const repeatLastSet = () => {
    if (!active || !selectedEx) return
    const prev = [...active.sets].reverse().find((s) => s.exerciseId === selectedEx)
    if (!prev) return
    setWeight(prev.weightKg)
    setReps(prev.reps)
    const ex = exerciseById(selectedEx)
    if (!ex) return
    const setIndex = active.sets.filter((s) => s.exerciseId === selectedEx).length + 1
    const row: WorkoutSet = {
      id: newId(),
      exerciseId: selectedEx,
      exerciseName: ex.nameZh,
      setIndex,
      weightKg: prev.weightKg,
      reps: prev.reps,
      restSec,
      completedAt: new Date().toISOString(),
    }
    const next = { ...active, sets: [...active.sets, row] }
    persistActive(next)
    const prPrev = prs[selectedEx]
    const isPR =
      !prPrev ||
      prev.weightKg > prPrev.weightKg ||
      (prev.weightKg === prPrev.weightKg && prev.reps > prPrev.reps)
    if (isPR && prev.weightKg > 0) {
      const nextPrs = {
        ...prs,
        [selectedEx]: { weightKg: prev.weightKg, reps: prev.reps, at: row.completedAt },
      }
      setPrs(nextPrs)
      savePRs(nextPrs)
      setPrToast(`${ex.nameZh} · ${prev.weightKg} kg × ${prev.reps}`)
      window.setTimeout(() => setPrToast(null), 2800)
    }
    setJustAdded(row.id)
    window.setTimeout(() => setJustAdded(null), 500)
    setRestLeft(restSec)
    setRestRunning(true)
    setRestReadyNext(false)
    buzzLight()
  }

  const finishSession = () => {
    if (!active) return
    const endedAt = new Date().toISOString()
    const draft: WorkoutSession = {
      ...active,
      endedAt,
    }
    const analysis = analyzeWorkout(draft, sessions)
    const ended: WorkoutSession = { ...draft, analysis }
    const next = [ended, ...sessions]
    setSessions(next)
    saveSessions(next)
    persistActive(null)
    setLastFinished(ended)
    setLastAnalysis(analysis)
    setFinishOpen(true)
    setSelectedEx(null)
    markTrainedToday(ended.endedAt)
    syncDaysFromSessions(next)
    if (user) {
      void (async () => {
        try {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueWorkout(ended)
            setCloudNote(`離線暫存 · 排隊 ${offlineQueueCount()} 項，上網再 sync`)
            return
          }
          const supabase = createClient()
          await persistFinishedWorkout(supabase, user.id, ended)
          setCloudNote('呢次訓練已上雲')
        } catch (e) {
          enqueueWorkout(ended)
          setCloudNote(
            (e instanceof Error ? e.message : '上雲唔到') + ' · 已離線暫存，返到線會自動 sync'
          )
        }
      })()
    } else {
      /* guest: local only */
    }
    // Fitness achievements
    try {
      const newly = evaluateFitnessAchievements({
        sessions: next,
        meals: [],
        prs: loadPRs(),
        already: loadFitnessUnlocked(),
      })
      if (newly.length) {
        unlockFitnessAchievements(newly)
        const a = fitnessAchievementById(newly[0])
        if (a) {
          setAchToast(`${a.emoji} ${a.title}`)
          window.setTimeout(() => setAchToast(null), 2600)
        }
      }
    } catch {
      /* ignore */
    }
  }

  const discardSession = () => {
    if (!window.confirm('放棄呢次訓練？組數唔會留低。')) return
    persistActive(null)
    setSelectedEx(null)
    setRestRunning(false)
    setRestLeft(null)
    setRestReadyNext(false)
  }

  const filtered = useMemo(() => searchExercises(search), [search])

  const [todayDone, setTodayDone] = useState<WorkoutSession[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [sparkline, setSparkline] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [sparkLabels, setSparkLabels] = useState<string[]>(['一','二','三','四','五','六','日'])
  const [historyCurve, setHistoryCurve] = useState<{ key: string; label: string; volume: number }[]>([])
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekTrainCount, setWeekTrainCount] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!ready) return
    setTodayHint(getTodayPlanHint(sessions))
    setCustomPlans(loadCustomDayPlans())
    setWeekSlots(loadWeeklySchedule())
    setWeekProgress(computeWeeklySlotProgress(sessions))
    setTodayDone(sessions.filter((s) => s.endedAt && isSameDay(s.startedAt)))
    const w = weekConsistency(sessions)
    setWeekDays(w.days)
    setWeekTrainCount(w.trainedCount)
    setStreak(w.streak)
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    setWeekVolume(
      sessions
        .filter((s) => new Date(s.startedAt).getTime() >= weekAgo)
        .reduce((a, s) => a + volumeOf(s.sets), 0)
    )
    const days: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = todayKey(d)
      const vol = sessions
        .filter((s) => isSameDay(s.startedAt, key))
        .reduce((a, s) => a + volumeOf(s.sets), 0)
      days.push(vol)
    }
    setSparkline(days)
    const labels = ['一', '二', '三', '四', '五', '六', '日']
    const labs: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      labs.push(labels[d.getDay() === 0 ? 6 : d.getDay() - 1])
    }
    setSparkLabels(labs)
    setHistoryCurve(volumeByDay(sessions, 14))
  }, [sessions, ready])

  const setsByExercise = useMemo(() => {
    if (!active) return [] as { id: string; name: string; sets: WorkoutSet[] }[]
    const map = new Map<string, WorkoutSet[]>()
    for (const s of active.sets) {
      const list = map.get(s.exerciseId) || []
      list.push(s)
      map.set(s.exerciseId, list)
    }
    return [...map.entries()].map(([id, sets]) => ({
      id,
      name: sets[0]?.exerciseName || id,
      sets,
    }))
  }, [active])

  if (!ready || !authReady) {
    return (
      <AppShell>
        <PageSkeleton wide />
      </AppShell>
    )
  }

  const lastLoggedForSelected =
    selectedEx && active
      ? [...active.sets].reverse().find((s) => s.exerciseId === selectedEx) ||
        lastSetForExercise(sessions, selectedEx)
      : null

  const nextPlanExercise = planQueue.find((id) => id !== selectedEx) || null

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <PageHeader
          eyebrow="訓練"
          title="今日爆機未？"
          description="一掣加組、自動帶入上次重量——唔使慢慢填表。"
          trailing={
            active && !active.endedAt ? (
              <div className="shrink-0 rounded-2xl border border-border/80 bg-surface px-3.5 py-2.5 shadow-soft text-right">
                <div className="flex items-center gap-1.5 text-[10px] text-muted justify-end">
                  <Clock className="h-3 w-3" />
                  練緊
                </div>
                <div className="font-semibold tabular-nums text-lg text-accent leading-tight">
                  {formatDuration(elapsed)}
                </div>
              </div>
            ) : undefined
          }
        />

        {!user && (
          <div className="mb-5">
            <LoginPromptBanner />
          </div>
        )}
        {user && cloudNote && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-[11px] text-accent">
            <span className="font-semibold shrink-0">上雲</span>
            <span className="leading-relaxed text-accent/90">{cloudNote}</span>
          </div>
        )}

        <div className="mb-6 flex gap-1.5 p-1 rounded-2xl bg-[#f0efee] border border-border">
          {(
            [
              { id: 'today' as const, label: '今日', icon: Play },
              { id: 'meetup' as const, label: '凑局', icon: Users },
              { id: 'templates' as const, label: '課表', icon: Sparkles },
              { id: 'history' as const, label: '歷史', icon: History },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors',
                tab === id ? 'text-accent' : 'text-muted hover:text-foreground'
              )}
            >
              {tab === id && (
                <motion.span
                  layoutId="train-tab"
                  className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                  transition={springSoft}
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'today' && (
            <motion.div
              key="today"
              initial={reduce ? false : tabPanel.initial}
              animate={tabPanel.animate}
              exit={reduce ? undefined : tabPanel.exit}
              transition={springSoft}
              className="space-y-5"
            >
              {!active ? (
                <Stagger className="space-y-4">
                  <StaggerItem>
                    <GymNudgeCard
                      streak={streak}
                      hasActiveSession={false}
                      onStart={() => startSession()}
                    />
                  </StaggerItem>
                  <StaggerItem>
                    <TrainCoachCard
                      sessions={sessions}
                      onStartTemplate={(id, ids) => startSession(id, ids)}
                    />
                  </StaggerItem>
                  <StaggerItem>
                    <ActivePlanPanel
                      compact
                      refreshKey={planRefreshKey}
                      onStartDay={(title, ids) => {
                        if (active && !window.confirm('而家練緊，改用呢個課表？')) return
                        startSession(`plan:${title}`, ids)
                      }}
                    />
                  </StaggerItem>
                  {Object.keys(prs).length > 0 && (
                    <StaggerItem>
                      <Card className="py-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-accent" />
                            <CardTitle className="text-lg">PR 速覽</CardTitle>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTab('history')}
                            className="text-[11px] font-semibold text-accent touch-manipulation"
                          >
                            睇晒 PR 牆 →
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {Object.entries(prs)
                            .sort((a, b) => b[1].weightKg - a[1].weightKg)
                            .slice(0, 3)
                            .map(([id, pr]) => (
                              <li
                                key={id}
                                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                              >
                                <span className="text-sm font-medium truncate">
                                  {exerciseById(id)?.nameZh || id}
                                </span>
                                <span className="text-sm tabular-nums text-accent font-semibold shrink-0">
                                  {pr.weightKg} kg × {pr.reps}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </Card>
                    </StaggerItem>
                  )}
                  {todayHint && (
                    <StaggerItem>
                      <Card
                        className={
                          todayHint.doneToday
                            ? 'py-4 border-border'
                            : 'py-4 border-accent/35 bg-gradient-to-br from-accent-soft/70 via-surface to-surface ring-1 ring-accent/20'
                        }
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold tracking-wide text-accent mb-0.5">
                              今日課表 · 一掣開波
                            </p>
                            <CardTitle className="text-lg leading-snug">
                              {todayHint.slot.templateId
                                ? `星期${todayHint.slot.nameZh} · ${todayHint.slot.label}`
                                : `星期${todayHint.slot.nameZh} · 休息日`}
                            </CardTitle>
                          </div>
                          <Badge tone={todayHint.doneToday ? 'muted' : 'accent'}>
                            {todayHint.doneToday
                              ? '今日✓'
                              : `${todayHint.weekDone}/${todayHint.weekTotal} 週`}
                          </Badge>
                        </div>
                        <CardDesc className="mb-3">{todayHint.nextLabel}</CardDesc>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {weekSlots.map((s) => (
                            <span
                              key={s.dayIndex}
                              className={
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ' +
                                (s.dayIndex === todayHint.slot.dayIndex
                                  ? 'bg-accent text-white border-accent'
                                  : s.templateId
                                    ? 'bg-accent-soft/50 text-accent border-accent/20'
                                    : 'bg-[#fafaf9] text-muted border-border')
                              }
                              title={s.label}
                            >
                              {s.nameZh}
                            </span>
                          ))}
                        </div>
                        {todayHint.template && !todayHint.doneToday && (
                          <Button
                            size="lg"
                            className="w-full touch-manipulation"
                            onClick={() =>
                              startSession(
                                todayHint.template!.id,
                                todayHint.template!.exerciseIds
                              )
                            }
                          >
                            <Play className="h-4 w-4" />
                            開今日 · {todayHint.template.name}
                          </Button>
                        )}
                        {todayHint.doneToday && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => setTab('templates')}
                          >
                            睇成週課表／進度
                          </Button>
                        )}
                        {!todayHint.template && !todayHint.doneToday && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const t = TEMPLATES.find((x) => x.id === 'fullbody')
                                if (t) startSession(t.id, t.exerciseIds)
                              }}
                            >
                              輕全身開波
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1"
                              onClick={() => setTab('templates')}
                            >
                              改週課表
                            </Button>
                          </div>
                        )}
                      </Card>
                    </StaggerItem>
                  )}
                  <StaggerItem>
                    <Card className="overflow-hidden relative">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent-soft),_transparent_55%)] pointer-events-none" />
                      <div className="relative">
                        <CardTitle>未開波？</CardTitle>
                        <CardDesc className="mt-2 mb-5">
                          撳下面開今日場。組間休息完會自動跳下一組同 focus 重量——少撳幾吓。
                        </CardDesc>
                        <Button size="lg" className="w-full sm:w-auto" onClick={() => startSession()}>
                          <Play className="h-4 w-4" />
                          開波
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                  <StaggerItem>
                    <Card className="py-4 border-accent/25 bg-accent-soft/30">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge tone="accent">新手</Badge>
                        <CardTitle className="text-lg leading-snug">
                          唔識 RDL／硬拉／保加利亞？
                        </CardTitle>
                      </div>
                      <CardDesc className="mb-3">
                        搜俗稱就搵到；每個動作有「點做」步驟＋示範。一掣開波用腿日或推拉腿模板。
                      </CardDesc>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {NEWBIE_SEARCH_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              startSession()
                              setSearch(chip)
                              setPickerOpen(true)
                              setPickerHowtoId(null)
                            }}
                            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft touch-manipulation"
                          >
                            搜「{chip}」
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {NEWBIE_QUICK_TEMPLATES.slice(0, 4).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => startSession(t.id, t.exerciseIds)}
                            className="text-left rounded-2xl border border-border bg-surface px-3 py-2.5 hover:border-accent/40 hover:bg-accent-soft/40 transition touch-manipulation"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {t.badge && <Badge tone="muted">{t.badge}</Badge>}
                              <span className="text-sm font-semibold">{t.name}</span>
                            </div>
                            <p className="text-[10px] text-muted leading-relaxed line-clamp-2">
                              {t.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </Card>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="py-4">
                        <div className="text-[11px] text-muted mb-1">今日完成</div>
                        <div className="text-2xl font-semibold tabular-nums">{todayDone.length}</div>
                        <div className="text-xs text-muted">次</div>
                      </Card>
                      <Card className="py-4">
                        <div className="text-[11px] text-muted mb-1">近 7 日容量</div>
                        <div className="text-2xl font-semibold tabular-nums">
                          {Math.round(weekVolume).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted">kg×reps</div>
                      </Card>
                    </div>
                  </StaggerItem>
                  <StaggerItem>
                    <Card className="py-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-accent" />
                          <CardTitle className="text-lg">連貫</CardTitle>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums text-accent">
                            {streak > 0 ? `連練 ${streak}` : `${weekTrainCount}/7`}
                          </div>
                          <div className="text-[10px] text-muted">
                            {streak > 0 ? '日' : '呢個星期'}
                          </div>
                        </div>
                      </div>
                      <WeekDots days={weekDays} />
                      <p className="mt-3 text-[11px] text-muted leading-relaxed">
                        {todayDone.length > 0
                          ? '今日已經打卡——聽日再嚟就繼續連練。'
                          : streak > 0
                            ? '今日未開波，去下面撳開波保持連練。'
                            : '一星期練一兩日都好——點亮個點就得。'}
                      </p>
                    </Card>
                  </StaggerItem>
                  {sessions.some((s) => s.endedAt) ? (
                    <>
                      <StaggerItem>
                        <Card>
                          <div className="flex items-center justify-between mb-3">
                            <CardTitle className="text-lg">呢個星期</CardTitle>
                            <Badge tone="muted">容量</Badge>
                          </div>
                          <Sparkline values={sparkline} labels={sparkLabels} />
                        </Card>
                      </StaggerItem>
                      <StaggerItem>
                        <Card className="py-4">
                          <CardTitle className="text-lg mb-3">訓練熱圖</CardTitle>
                          <TrainHeatmap sessions={sessions} weeks={12} />
                        </Card>
                      </StaggerItem>
                    </>
                  ) : (
                    <StaggerItem>
                      <Card className="py-4 border-dashed">
                        <CardTitle className="text-lg mb-1">熱圖同容量稍後出現</CardTitle>
                        <CardDesc>
                          完場一次之後，呢度會有星期曲線同訓練熱圖——而家跟教練建議或新手腿日開波就得。
                        </CardDesc>
                      </Card>
                    </StaggerItem>
                  )}
                </Stagger>
              ) : (
                <div className="space-y-4">
                  {(active.sets.length === 0 || sessions.filter((s) => s.endedAt).length === 0) && (
                    <Card className="py-4 border-accent/25 bg-accent-soft/25">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge tone="accent">首次</Badge>
                        <CardTitle className="text-base">三步搞掂呢場</CardTitle>
                      </div>
                      <ol className="space-y-2.5 text-sm">
                        <li className="flex gap-2.5 items-start">
                          <span
                            className={
                              selectedEx
                                ? 'shrink-0 h-5 w-5 rounded-full bg-accent text-white text-[11px] flex items-center justify-center'
                                : 'shrink-0 h-5 w-5 rounded-full border border-accent text-accent text-[11px] flex items-center justify-center'
                            }
                          >
                            {selectedEx ? '✓' : '1'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">揀一個動作</div>
                            <p className="text-[11px] text-muted leading-relaxed">
                              搜 RDL／保加利亞／後腿都得；撳「點做」睇步驟。
                            </p>
                            {!selectedEx && (
                              <Button
                                size="sm"
                                variant="soft"
                                className="mt-1.5"
                                onClick={() => setPickerOpen(true)}
                              >
                                <Search className="h-3.5 w-3.5" />
                                開動作庫
                              </Button>
                            )}
                          </div>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <span
                            className={
                              active.sets.length > 0
                                ? 'shrink-0 h-5 w-5 rounded-full bg-accent text-white text-[11px] flex items-center justify-center'
                                : 'shrink-0 h-5 w-5 rounded-full border border-accent text-accent text-[11px] flex items-center justify-center'
                            }
                          >
                            {active.sets.length > 0 ? '✓' : '2'}
                          </span>
                          <div>
                            <div className="font-medium">填重量 × 次數，撳「記低」</div>
                            <p className="text-[11px] text-muted leading-relaxed">
                              唔記得就睇「點做」；重量唔夠就由輕開始。
                            </p>
                          </div>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <span className="shrink-0 h-5 w-5 rounded-full border border-accent text-accent text-[11px] flex items-center justify-center">
                            3
                          </span>
                          <div>
                            <div className="font-medium">休息完自動跳下一組</div>
                            <p className="text-[11px] text-muted leading-relaxed">
                              倒數完會 focus 重量格——改完再記，少撳幾吓。
                            </p>
                          </div>
                        </li>
                      </ol>
                    </Card>
                  )}
                  {/* Rest timer */}
                  {restLeft != null && (
                    <Card
                      className={cn(
                        'py-4 overflow-hidden',
                        restLeft === 0 && 'ring-2 ring-accent/35 rest-done-glow'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <ProgressRing
                            value={restSec - (restLeft || 0)}
                            max={restSec || 1}
                            size={72}
                            stroke={7}
                            label={formatRest(restLeft)}
                            tone={restLeft === 0 ? 'accent' : 'accent'}
                          />
                          {restLeft === 0 && (
                            <span className="pointer-events-none absolute inset-0 rounded-full rest-done-ring" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Timer className="h-3.5 w-3.5 text-accent shrink-0" />
                            <span className="truncate">
                              {restLeft === 0 ? '休息完 · 下一組啦' : '組間休息'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                            {restLeft === 0
                              ? '休息完自動跳下一組——重量格已 focus，改完撳「記低」或 Enter 即入帳。'
                              : restRunning
                                ? '倒數完自動跳下一組並 focus 重量——想加就 +15，唔使手動搵格'
                                : '已暫停'}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[60, 90, 120].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setRestSec(s)
                                  setRestLeft(s)
                                  setRestRunning(true)
                                }}
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[11px] border transition touch-manipulation',
                                  restSec === s
                                    ? 'border-accent bg-accent-soft text-accent'
                                    : 'border-border text-muted hover:text-foreground'
                                )}
                              >
                                {s}s
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setRestLeft((v) => Math.max(0, (v ?? 0) + 15))
                                setRestRunning(true)
                              }}
                              className="rounded-full px-2.5 py-1 text-[11px] border border-border text-muted hover:text-foreground touch-manipulation"
                            >
                              +15
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestRunning((v) => !v)}
                              className="rounded-full px-2.5 py-1 text-[11px] border border-border text-muted hover:text-foreground inline-flex items-center gap-1 touch-manipulation"
                            >
                              {restRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              {restRunning ? '暫停' : '繼續'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRestLeft(null)
                                setRestRunning(false)
                                setRestReadyNext(true)
                                window.setTimeout(() => {
                                  loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  weightRef.current?.focus()
                                  weightRef.current?.select()
                                }, 50)
                              }}
                              className="rounded-full px-2.5 py-1 text-[11px] border border-border text-muted hover:text-foreground touch-manipulation"
                            >
                              跳過 · 下一組
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Logger */}
                  <div ref={loggerRef}>
                  <Card
                    className={cn(restReadyNext && 'ring-2 ring-accent/30 rest-done-glow')}
                  >
                    {restReadyNext && (
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-accent text-white px-3.5 py-3 shadow-soft rest-done-glow">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold tracking-tight">
                            休息完 · 下一組準備好
                            {selectedEx
                              ? ` · 第 ${(active?.sets.filter((s) => s.exerciseId === selectedEx).length || 0) + 1} 組`
                              : ''}
                          </div>
                          <p className="text-[11px] text-white/85 mt-0.5 leading-snug">
                            重量／次數沿用上組——撳下面大掣「下一組」或 Enter 即入帳。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRestReadyNext(false)}
                          className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium touch-manipulation"
                        >
                          知喇
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-lg">記一組</CardTitle>
                      <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                        <Search className="h-3.5 w-3.5" />
                        {selectedEx ? exerciseById(selectedEx)?.nameZh : '揀動作'}
                      </Button>
                    </div>

                    {selectedEx ? (
                      <>
                        <div className="mb-3">
                          <div className="font-serif text-2xl tracking-tight">
                            {exerciseById(selectedEx)?.nameZh}
                          </div>
                          <div className="text-xs text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>{exerciseById(selectedEx)?.nameEn}</span>
                            {prs[selectedEx] && (
                              <span className="text-accent">
                                PR {prs[selectedEx].weightKg}kg × {prs[selectedEx].reps}
                              </span>
                            )}
                            {lastLoggedForSelected && (
                              <span>
                                上次 {lastLoggedForSelected.weightKg} kg × {lastLoggedForSelected.reps}
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <ExerciseHowTo exerciseId={selectedEx} />
                          </div>
                        </div>

                        {(() => {
                          const loggedIds = setsByExercise.map((g) => g.id)
                          const ids: string[] = []
                          for (const id of planQueue) if (!ids.includes(id)) ids.push(id)
                          for (const id of loggedIds) if (!ids.includes(id)) ids.push(id)
                          if (selectedEx && !ids.includes(selectedEx)) ids.unshift(selectedEx)
                          if (ids.length === 0) return null
                          return (
                            <div className="mb-3 -mx-1 px-1">
                              <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className="text-[10px] text-muted font-medium">快速換動作</span>
                                {nextPlanExercise && (
                                  <button
                                    type="button"
                                    onClick={() => pickExercise(nextPlanExercise)}
                                    className="text-[10px] font-medium text-accent touch-manipulation"
                                  >
                                    下一個 →
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 overscroll-x-contain">
                                {ids.map((id) => {
                                  const ex = exerciseById(id)
                                  if (!ex) return null
                                  const done = active?.sets.some((s) => s.exerciseId === id)
                                  const setCount =
                                    active?.sets.filter((s) => s.exerciseId === id).length || 0
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => pickExercise(id)}
                                      className={cn(
                                        'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium border transition touch-manipulation inline-flex items-center gap-1.5',
                                        selectedEx === id
                                          ? 'bg-accent text-white border-accent'
                                          : done
                                            ? 'bg-accent-soft/60 text-accent border-accent/20'
                                            : 'bg-surface border-border text-muted hover:text-foreground'
                                      )}
                                    >
                                      <span className="max-w-[7.5rem] truncate">{ex.nameZh}</span>
                                      {setCount > 0 && (
                                        <span
                                          className={cn(
                                            'tabular-nums text-[10px] rounded-full px-1.5 py-0.5',
                                            selectedEx === id ? 'bg-white/20' : 'bg-black/[0.05]'
                                          )}
                                        >
                                          {setCount}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                                <button
                                  type="button"
                                  onClick={() => setPickerOpen(true)}
                                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium border border-dashed border-border text-muted hover:text-accent hover:border-accent/40 touch-manipulation"
                                >
                                  + 其他
                                </button>
                              </div>
                            </div>
                          )
                        })()}

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] text-muted mb-1.5 block">重量 (kg)</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => bumpWeight(-2.5)}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-[#fafaf9] text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                −
                              </button>
                              <Input
                                ref={weightRef}
                                type="number"
                                inputMode="decimal"
                                step={2.5}
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value) || 0)}
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addSet()
                                  } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
                                    /* default tab ok */
                                  }
                                }}
                                className="text-center text-2xl font-semibold tabular-nums h-16 px-1"
                                aria-label="重量公斤"
                              />
                              <button
                                type="button"
                                onClick={() => bumpWeight(2.5)}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-[#fafaf9] text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                +
                              </button>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {[-5, -2.5, 2.5, 5].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => bumpWeight(d)}
                                  className="flex-1 rounded-xl py-1.5 text-[11px] font-medium text-accent hover:bg-accent-soft transition tabular-nums"
                                >
                                  {d > 0 ? '+' : ''}
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-muted mb-1.5 block">次數</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReps((r) => Math.max(1, r - 1))}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-[#fafaf9] text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                −
                              </button>
                              <Input
                                ref={repsRef}
                                type="number"
                                inputMode="numeric"
                                value={reps}
                                onChange={(e) => setReps(Number(e.target.value) || 1)}
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addSet()
                                  }
                                }}
                                className="text-center text-2xl font-semibold tabular-nums h-16 px-1"
                                aria-label="次數"
                              />
                              <button
                                type="button"
                                onClick={() => setReps((r) => r + 1)}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-[#fafaf9] text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                +
                              </button>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {[6, 8, 10, 12].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setReps(n)}
                                  className={cn(
                                    'flex-1 rounded-xl py-2.5 text-xs font-semibold transition tabular-nums touch-manipulation min-h-[44px]',
                                    reps === n
                                      ? 'bg-accent-soft text-accent'
                                      : 'text-muted hover:bg-accent-soft hover:text-accent'
                                  )}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                          <motion.div className="flex-[1.6]" whileTap={reduce ? undefined : { scale: 0.98 }} transition={springSnappy}>
                            <Button
                              size="xl"
                              className={cn(
                                'w-full text-base gap-2 h-16 rounded-[18px] shadow-hover touch-manipulation',
                                restReadyNext && 'rest-done-glow ring-2 ring-accent/25'
                              )}
                              onClick={addSet}
                            >
                              <Plus className="h-6 w-6" />
                              {restReadyNext ? '下一組 · ' : '記低 · '}
                              {weight}×{reps}
                            </Button>
                          </motion.div>
                          <Button
                            size="xl"
                            variant="secondary"
                            className="flex-1 h-14 text-sm px-3"
                            disabled={!lastLoggedForSelected}
                            onClick={repeatLastSet}
                            title="同上組重量次數再記一組"
                          >
                            同上
                          </Button>
                        </div>
                        {nextPlanExercise && planQueue.length <= 1 && (
                          <button
                            type="button"
                            onClick={() => pickExercise(nextPlanExercise)}
                            className="w-full text-center text-xs font-medium text-accent py-2 rounded-xl hover:bg-accent-soft transition touch-manipulation"
                          >
                            下一個：{exerciseById(nextPlanExercise)?.nameZh} →
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="w-full rounded-[20px] border border-dashed border-border py-10 text-sm text-muted hover:border-accent/40 hover:text-accent hover:bg-accent-soft/40 transition"
                      >
                        揀個動作開始記
                      </button>
                    )}
                  </Card>
                  </div>

                  {/* Sets list */}
                  {setsByExercise.length > 0 && (
                    <Card className="space-y-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">呢場組數</CardTitle>
                        <Badge tone="accent">
                          {active.sets.length} 組 · {Math.round(volumeOf(active.sets)).toLocaleString()} 容量
                        </Badge>
                      </div>
                      {setsByExercise.map((group) => (
                        <div key={group.id}>
                          <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => pickExercise(group.id)}
                              className={cn(
                                'text-sm font-medium truncate text-left touch-manipulation',
                                selectedEx === group.id ? 'text-accent' : 'hover:text-accent'
                              )}
                            >
                              {group.name}
                              {selectedEx === group.id ? ' · 記緊' : ''}
                            </button>
                            <ExerciseHowTo exerciseId={group.id} exerciseName={group.name} />
                          </div>
                          <ul className="space-y-1.5">
                            {group.sets.map((s) => (
                              <li
                                key={s.id}
                                className={cn(
                                  'flex items-center justify-between rounded-xl bg-[#fafaf9] border border-border px-3 py-2 text-sm',
                                  justAdded === s.id && 'pr-burst ring-2 ring-accent/25'
                                )}
                              >
                                <span className="text-muted tabular-nums w-8">#{s.setIndex}</span>
                                <span className="font-medium tabular-nums">
                                  {s.weightKg} kg × {s.reps}
                                </span>
                                <Check className="h-3.5 w-3.5 text-accent" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Card>
                  )}

                  <div className={`thumb-cta sticky z-20 -mx-1 px-1 pt-2 pb-1 bg-gradient-to-t from-background via-background to-transparent ${selectedEx ? 'above-nav-stack' : 'above-nav-gap'}`}>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="xl" className="flex-1 h-14" onClick={discardSession}>
                        放棄
                      </Button>
                      <Button
                        size="xl"
                        className="flex-[1.6] h-14 text-base"
                        disabled={active.sets.length === 0}
                        onClick={finishSession}
                      >
                        <Flame className="h-5 w-5" />
                        完場
                      </Button>
                    </div>
                  </div>
                  {selectedEx ? <div className="h-16 sm:hidden" aria-hidden /> : null}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'templates' && (
            <motion.div
              key="templates"
              initial={reduce ? false : tabPanel.initial}
              animate={tabPanel.animate}
              exit={reduce ? undefined : tabPanel.exit}
              transition={springSoft}
              className="space-y-4"
            >
              <ActivePlanPanel
                refreshKey={planRefreshKey}
                onStartDay={(title, ids) => {
                  if (active && !window.confirm('而家練緊，改用呢個課表？')) return
                  startSession(`plan:${title}`, ids)
                }}
              />

              <div className="space-y-2">
                <p className="text-xs text-muted px-0.5">完整週計劃（組數＋進度）· 撳一下跟住</p>
                <WeeklyPresets
                  userId={user?.id ?? null}
                  onApplied={() => setPlanRefreshKey((n) => n + 1)}
                />
              </div>

              <CustomPlanBuilder
                userId={user?.id ?? null}
                onSaved={() => setPlanRefreshKey((n) => n + 1)}
              />

              <Card className="py-4 border-accent/25 bg-accent-soft/25">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[11px] font-semibold text-accent tracking-wide mb-0.5">
                      簡易週循環 · 進度
                    </p>
                    <CardTitle className="text-lg">跟住轉，唔使每日諗練咩</CardTitle>
                  </div>
                  {todayHint && (
                    <Badge tone="accent">
                      {todayHint.weekDone}/{todayHint.weekTotal} 日
                    </Badge>
                  )}
                </div>
                <CardDesc className="mb-3">
                  預設推拉腿週；下面可換新手三堂／腿日加強／忙碌兩日。撳日子一掣開嗰日課表。
                </CardDesc>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {SCHEDULE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const next = applySchedulePreset(p.id)
                        setWeekSlots(next)
                        setTodayHint(getTodayPlanHint(sessions))
                        setSavedToast(`已套用「${p.name}」`)
                        window.setTimeout(() => setSavedToast(null), 2200)
                      }}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold border touch-manipulation',
                        p.newbie
                          ? 'border-accent/30 bg-accent text-white'
                          : 'border-border bg-surface text-muted hover:text-foreground'
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = DEFAULT_WEEKLY_PPL.map((s) => ({ ...s }))
                      saveWeeklySchedule(next)
                      setWeekSlots(next)
                      setTodayHint(getTodayPlanHint(sessions))
                    }}
                    className="rounded-full px-2.5 py-1 text-[10px] font-medium border border-dashed border-border text-muted"
                  >
                    重置
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1.5 mb-3">
                  {(weekProgress.length
                    ? weekProgress
                    : weekSlots.map((slot) => ({
                        slot,
                        done: false,
                        isToday: todayHint?.slot.dayIndex === slot.dayIndex,
                      }))
                  ).map(({ slot: s, done: slotDone, isToday }) => {
                    const tpl = s.templateId
                      ? TEMPLATES.find((t) => t.id === s.templateId)
                      : null
                    return (
                      <button
                        key={s.dayIndex}
                        type="button"
                        disabled={!tpl}
                        onClick={() => {
                          if (!tpl) return
                          if (active && !window.confirm('而家練緊，改用呢個課表？')) return
                          startSession(tpl.id, tpl.exerciseIds)
                        }}
                        className={cn(
                          'rounded-xl border px-1 py-2 text-center touch-manipulation transition',
                          isToday
                            ? 'border-accent bg-accent text-white'
                            : slotDone
                              ? 'border-accent/30 bg-accent-soft text-accent'
                              : 'border-border bg-surface text-muted',
                          !tpl && 'opacity-60'
                        )}
                        title={s.label}
                      >
                        <div className="text-[10px] font-semibold">{s.nameZh}</div>
                        <div className="text-[9px] mt-0.5 leading-tight line-clamp-2">
                          {slotDone ? '✓ ' : ''}
                          {s.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {todayHint?.template && !todayHint.doneToday && (
                  <Button
                    className="w-full"
                    onClick={() =>
                      startSession(
                        todayHint.template!.id,
                        todayHint.template!.exerciseIds
                      )
                    }
                  >
                    <Play className="h-4 w-4" />
                    開今日 · {todayHint.template.name}
                  </Button>
                )}
              </Card>

              {customPlans.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <p className="text-xs font-medium text-muted">我存低嘅課表</p>
                    <Badge tone="muted">{customPlans.length}</Badge>
                  </div>
                  <Stagger className="grid gap-3 sm:grid-cols-2">
                    {customPlans.map((cp) => (
                      <StaggerItem key={cp.id}>
                        <Card className="h-full flex flex-col border-accent/20">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge tone="accent">{cp.badge || '自訂'}</Badge>
                            <CardTitle className="text-lg">{cp.name}</CardTitle>
                          </div>
                          {cp.desc && (
                            <CardDesc className="mt-1 mb-3 flex-1">{cp.desc}</CardDesc>
                          )}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {cp.exerciseIds.slice(0, 4).map((id) => (
                              <Badge key={id} tone="muted">
                                {exerciseById(id)?.nameZh || id}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                if (active && !window.confirm('而家練緊，改用呢個課表？'))
                                  return
                                startSession(`custom:${cp.id}`, cp.exerciseIds)
                              }}
                            >
                              用呢個開波
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                deleteCustomDayPlan(cp.id)
                                setCustomPlans(loadCustomDayPlans())
                              }}
                            >
                              刪
                            </Button>
                          </div>
                        </Card>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              )}

              <Stagger className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 mb-1">
                  <p className="text-xs text-muted leading-relaxed">
                    推拉腿（PPL）＝推日／拉日／腿日輪流。新手可先用「新手腿日」——入面有 RDL、保加利亞，撳動作就睇點做。鍾意就「存做我嘅課表」。
                  </p>
                </div>
                {TEMPLATES.map((t) => (
                  <StaggerItem key={t.id}>
                    <Card
                      hover
                      className={cn(
                        'h-full flex flex-col',
                        t.newbie && 'border-accent/30 bg-accent-soft/20'
                      )}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.badge && (
                          <Badge tone={t.newbie ? 'accent' : 'muted'}>{t.badge}</Badge>
                        )}
                        <CardTitle className="text-xl">{t.name}</CardTitle>
                      </div>
                      <CardDesc className="mt-1 mb-4 flex-1">{t.desc}</CardDesc>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {t.exerciseIds.slice(0, 4).map((id) => (
                          <Badge key={id} tone="muted">
                            {exerciseById(id)?.nameZh}
                          </Badge>
                        ))}
                        {t.exerciseIds.length > 4 && (
                          <Badge tone="muted">+{t.exerciseIds.length - 4}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Button
                          size="sm"
                          variant="soft"
                          className="flex-1"
                          onClick={() => {
                            if (active && !window.confirm('而家練緊，改用呢個課表？')) return
                            startSession(t.id, t.exerciseIds)
                          }}
                        >
                          用呢個開波
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            saveTemplateAsCustom(t)
                            setCustomPlans(loadCustomDayPlans())
                            setSavedToast(`已存「${t.name}」`)
                            window.setTimeout(() => setSavedToast(null), 2200)
                          }}
                        >
                          存
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
              {savedToast && (
                <div className="above-nav-gap fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0f766e] text-white text-sm px-4 py-2 shadow-lg">
                  {savedToast}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'meetup' && (
            <motion.div
              key="meetup"
              initial={reduce ? false : tabPanel.initial}
              animate={tabPanel.animate}
              exit={reduce ? undefined : tabPanel.exit}
              transition={springSoft}
            >
              <MeetupBoard />
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div
              key="history"
              initial={reduce ? false : tabPanel.initial}
              animate={tabPanel.animate}
              exit={reduce ? undefined : tabPanel.exit}
              transition={springSoft}
              className="space-y-4"
            >
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-lg">近 14 日容量</CardTitle>
                  <Badge tone="muted">曲線</Badge>
                </div>
                <Sparkline
                  values={historyCurve.map((d) => d.volume)}
                  labels={historyCurve.map((d) => d.label)}
                />
                <p className="mt-2 text-[11px] text-muted">
                  同課表打通：喺「我」頁出計劃後一掣開波，完場會計入呢度。
                </p>
              </Card>

              <Card className="py-4">
                <CardTitle className="text-lg mb-3">訓練熱圖</CardTitle>
                <TrainHeatmap sessions={sessions} weeks={16} />
              </Card>

              <Card id="pr-wall">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-accent" />
                    <CardTitle className="text-lg">PR 牆</CardTitle>
                  </div>
                  {Object.keys(prs).length > 0 && (
                    <Badge tone="accent">{Object.keys(prs).length} 項</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted mb-3 -mt-1 leading-relaxed">
                  破個人最佳會即時彈 toast；完整清單永遠喺「歷史」呢度。
                </p>
                {Object.keys(prs).length === 0 ? (
                  <p className="text-sm text-muted leading-relaxed">
                    未有個人最佳——去今日開波記第一組，破紀錄就會喺度出現。
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {Object.entries(prs)
                      .sort((a, b) => b[1].weightKg - a[1].weightKg)
                      .slice(0, 8)
                      .map(([id, pr]) => (
                        <li
                          key={id}
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                        >
                          <span className="text-sm font-medium">{exerciseById(id)?.nameZh || id}</span>
                          <span className="text-sm tabular-nums text-accent font-semibold">
                            {pr.weightKg} kg × {pr.reps}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </Card>

              {sessions.length === 0 ? (
                <EmptyState
                  emoji="🏋️"
                  title="仲未有歷史"
                  description="第一次完場之後，日曆、熱圖同容量會喺度長出來。而家可以開腿日或自由練。"
                  actionLabel="去今日開波"
                  onAction={() => setTab('today')}
                  secondaryLabel="睇新手課表"
                  onSecondary={() => setTab('templates')}
                />
              ) : (
                <Stagger className="space-y-3">
                  {sessions.slice(0, 20).map((s) => {
                    const dur =
                      s.endedAt && s.startedAt
                        ? Math.round(
                            (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000
                          )
                        : 0
                    return (
                      <StaggerItem key={s.id}>
                        <Card className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(s.startedAt).toLocaleString('zh-HK', {
                                  month: 'short',
                                  day: 'numeric',
                                  weekday: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className="text-xs text-muted mt-0.5">
                                {s.sets.length} 組 · {Math.round(volumeOf(s.sets)).toLocaleString()}{' '}
                                容量
                                {dur > 0 && ` · ${formatDuration(dur)}`}
                              </div>
                            </div>
                            <Badge tone="accent">
                              {TEMPLATES.find((t) => t.id === s.templateId)?.name || '自由練'}
                            </Badge>
                          </div>
                          {s.analysis && (
                            <div className="mt-3">
                              <ShareCardButton
                                kind="workout"
                                label="再分享呢場"
                                variant="soft"
                                size="sm"
                                payload={{
                                  title: TEMPLATES.find((t) => t.id === s.templateId)?.name || '訓練',
                                  volume: s.analysis.volume,
                                  sets: s.analysis.sets,
                                  durationSec: s.analysis.durationSec,
                                  topExercises: [
                                    ...new Map(
                                      s.sets.map((x) => [
                                        x.exerciseId,
                                        `${x.exerciseName} ${x.weightKg}×${x.reps}`,
                                      ])
                                    ).values(),
                                  ].slice(0, 5),
                                  dateLabel: new Date(s.endedAt || s.startedAt).toLocaleString('zh-HK', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                  tip: s.analysis.tips?.[0],
                                }}
                              />
                            </div>
                          )}
                        </Card>
                      </StaggerItem>
                    )
                  })}
                </Stagger>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>

      {/* Exercise picker */}
      {active && selectedEx && tab === 'today' && (
        <div className="one-hand-sticky fixed above-nav-gap left-0 right-0 z-40 px-4 pointer-events-none sm:hidden md:hidden">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <Button
              size="xl"
              className="w-full h-14 rounded-[18px] shadow-hover text-base touch-manipulation"
              onClick={addSet}
            >
              <Plus className="h-5 w-5" />
              記低 · {weight}×{reps}
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label="揀動作"
              className="w-full max-w-md max-h-[80dvh] overflow-hidden rounded-[20px] bg-surface border border-border shadow-hover flex flex-col"
              initial={reduce ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: 16, opacity: 0 }}
              transition={springSoft}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted shrink-0" />
                  <Input
                    autoFocus
                    placeholder="搜俗稱：RDL、保加利亞、後腿、硬拉…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 shadow-none focus:ring-0 px-0 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(false)
                      setPickerHowtoId(null)
                    }}
                    aria-label="關閉"
                  >
                    <X className="h-5 w-5 text-muted" />
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
                  {NEWBIE_SEARCH_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSearch(chip)}
                      className={cn(
                        'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                        search === chip
                          ? 'border-accent bg-accent text-white'
                          : 'border-border text-accent hover:bg-accent-soft'
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  撳動作＝加入今日訓練；「點做」睇步驟／GIF。未開波都會自動幫你開場。
                </p>
              </div>
              <ul className="overflow-y-auto p-2 flex-1">
                {(search ? filtered : EXERCISES).length === 0 ? (
                  <li className="px-3 py-8 text-center text-sm text-muted">
                    搵唔到「{search}」——試吓 RDL、保加利亞、後腿、硬拉
                  </li>
                ) : (
                  (search ? filtered : EXERCISES).map((ex) => {
                    const aliasHit = search ? matchedAliasLabel(ex, search) : null
                    const howtoOpen = pickerHowtoId === ex.id
                    return (
                      <li key={ex.id} className="mb-1">
                        <div className="rounded-2xl hover:bg-accent-soft/60 transition">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => addToToday(ex.id)}
                              className="flex-1 text-left rounded-2xl px-3 py-3 flex items-center justify-between min-w-0"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                                  <span>{ex.nameZh}</span>
                                  <span className="text-[10px] font-semibold text-accent">
                                    加入今日
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted">
                                  {ex.nameEn} · {ex.muscle}
                                  {aliasHit ? ` · 又叫「${aliasHit}」` : ''}
                                </div>
                              </div>
                              {prs[ex.id] && (
                                <span className="text-[11px] text-accent tabular-nums ml-2 shrink-0">
                                  {prs[ex.id].weightKg}kg
                                </span>
                              )}
                            </button>
                            <div className="pr-2 shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPickerHowtoId((cur) => (cur === ex.id ? null : ex.id))
                                }}
                                className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft touch-manipulation"
                              >
                                {howtoOpen ? '收埋' : '點做'}
                              </button>
                              <ExerciseHowToHint exercise={ex} />
                            </div>
                          </div>
                          {howtoOpen && (
                            <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                              <ExerciseHowTo
                                exerciseId={ex.id}
                                variant="panel"
                                alwaysOpen
                              />
                              <Button
                                size="sm"
                                variant="soft"
                                className="mt-2 w-full"
                                onClick={() => addToToday(ex.id)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                一鍵加入今日 · {ex.nameZh}
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR toast */}
      <AnimatePresence>
        {prToast && (
          <motion.button
            type="button"
            className="fixed top-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-foreground text-background px-4 py-3 shadow-hover flex items-center gap-2 max-w-[90vw] text-left touch-manipulation"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springSoft}
            role="status"
            onClick={() => {
              setPrToast(null)
              setTab('history')
              window.setTimeout(() => {
                document.getElementById('pr-wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 120)
            }}
          >
            <Trophy className="h-4 w-4 text-amber-300 shrink-0" />
            <div>
              <div className="text-xs opacity-70">新 PR 🎉 · 撳睇牆</div>
              <div className="text-sm font-medium">{prToast}</div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {achToast && (
          <motion.div
            className="fixed top-20 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-accent text-white px-4 py-3 shadow-hover max-w-[90vw]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springSoft}
            role="status"
          >
            <div className="text-xs opacity-80">解鎖成就</div>
            <div className="text-sm font-medium">{achToast}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish modal */}
      <AnimatePresence>
        {finishOpen && lastAnalysis && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-surface border border-border p-6 shadow-hover"
              initial={reduce ? false : { scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={springSoft}
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🔥</div>
                <h2 className="font-serif text-2xl mb-1">搞掂！</h2>
                <p className="text-sm text-muted">今日練完啦。分析已跟住呢場儲低。</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-2xl border border-border bg-[#fafaf9] px-3 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {lastAnalysis.volume.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted">容量 kg×reps</div>
                  {formatDelta(lastAnalysis.volumeDeltaPct) && (
                    <div className="text-[11px] text-accent mt-0.5 font-medium">
                      {formatDelta(lastAnalysis.volumeDeltaPct)}
                      {lastAnalysis.compareLabel ? ` · ${lastAnalysis.compareLabel}` : ''}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-[#fafaf9] px-3 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">{lastAnalysis.sets}</div>
                  <div className="text-[10px] text-muted">總組數</div>
                </div>
                <div className="rounded-2xl border border-border bg-[#fafaf9] px-3 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {Math.floor(lastAnalysis.durationSec / 60)}:{String(lastAnalysis.durationSec % 60).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-muted">時長</div>
                  {formatDelta(lastAnalysis.durationDeltaPct) && (
                    <div className="text-[11px] text-muted mt-0.5">
                      {formatDelta(lastAnalysis.durationDeltaPct)} 時間
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-[#fafaf9] px-3 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">{lastAnalysis.density}</div>
                  <div className="text-[10px] text-muted">密度／分鐘</div>
                </div>
              </div>

              <div className="rounded-[20px] border border-border bg-[#fafaf9] p-4 mb-5 text-left">
                <div className="text-xs font-semibold text-accent mb-2">今日建議</div>
                <ul className="space-y-2">
                  {lastAnalysis.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-foreground/90 leading-relaxed flex gap-2">
                      <span className="text-accent shrink-0">·</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted mt-3 leading-relaxed">
                  提示只係一般訓練參考，唔係醫療建議。身體唔舒服就停低休息。
                </p>
              </div>

              {lastFinished && lastAnalysis && (
                <div className="mb-4 rounded-[20px] border border-accent/30 bg-accent-soft/40 p-4">
                  <div className="text-sm font-semibold text-accent mb-1">出分享卡</div>
                  <p className="text-[11px] text-muted mb-3 leading-relaxed">
                    一掣出圖——發 Threads／IG／WhatsApp 都得。街坊見到你練完會想一齊嚟。
                  </p>
                  <ShareCardButton
                    kind="workout"
                    label="分享呢場 · 出圖"
                    variant="default"
                    size="lg"
                    payload={{
                      title: '搞掂！',
                      volume: lastAnalysis.volume,
                      sets: lastAnalysis.sets,
                      durationSec: lastAnalysis.durationSec,
                      topExercises: [
                        ...new Map(
                          lastFinished.sets.map((s) => [
                            s.exerciseId,
                            `${s.exerciseName} ${s.weightKg}×${s.reps}`,
                          ])
                        ).values(),
                      ].slice(0, 5),
                      dateLabel: new Date(lastFinished.endedAt || lastFinished.startedAt).toLocaleString(
                        'zh-HK',
                        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      ),
                      tip: lastAnalysis.tips[0],
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                {Object.keys(prs).length > 0 && (
                  <Button
                    variant="soft"
                    className="w-full"
                    onClick={() => {
                      setFinishOpen(false)
                      setLastFinished(null)
                      setTab('history')
                      window.setTimeout(() => {
                        document.getElementById('pr-wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 120)
                    }}
                  >
                    <Trophy className="h-4 w-4" />
                    睇 PR 牆
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setFinishOpen(false)
                    setLastFinished(null)
                  }}
                >
                  收工
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          <SyncToast message={syncToast} onDismiss={() => setSyncToast(null)} />
    </AppShell>
  )
}

function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {values.map((v, i) => {
        const h = Math.max(8, (v / max) * 100)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-lg bg-accent/80 min-h-[4px] transition-all"
              style={{ height: `${h}%` }}
              title={`${Math.round(v)}`}
            />
            <span className="text-[9px] text-muted">{labels[i] || ''}</span>
          </div>
        )
      })}
    </div>
  )
}
