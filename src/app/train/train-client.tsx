'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  X,
} from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import {
  EXERCISES,
  TEMPLATES,
  exerciseById,
  searchExercises,
} from '@/lib/fitness/exercises'
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
import {
  fetchWorkouts,
  migrateLocalWorkouts,
  persistFinishedWorkout,
} from '@/lib/fitness/cloud'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import { LoginPromptBanner } from '@/components/auth/login-card'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

type Tab = 'today' | 'templates' | 'history'

export function TrainClient() {
  const reduce = useReducedMotion()
  const { ready: authReady, user } = useUser()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [cloudNote, setCloudNote] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [active, setActive] = useState<WorkoutSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [prs, setPrs] = useState(loadPRs())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(8)
  const [restSec, setRestSec] = useState(90)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restRunning, setRestRunning] = useState(false)
  const [prToast, setPrToast] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    const s = loadSessions()
    setSessions(s)
    setPrs(loadPRs())
    const a = loadActiveSession()
    setActive(a)
    setReady(true)
  }, [])

  // Cloud hydrate when logged in
  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        await migrateLocalWorkouts(supabase, user.id, loadSessions())
        const remote = await fetchWorkouts(supabase, 80)
        if (cancelled) return
        setSessions(remote)
        saveSessions(remote)
        setCloudNote('訓練已同步雲端')
      } catch (e) {
        if (!cancelled) setCloudNote(e instanceof Error ? e.message : '訓練同步失敗')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  // One-tap start from workout plan (?exercises=id1,id2)
  useEffect(() => {
    if (!ready) return
    const raw = searchParams.get('exercises')
    const fromPlan = searchParams.get('plan')
    if (!raw) return
    const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
    if (ids.length === 0) return
    if (loadActiveSession()) return
    const sess: WorkoutSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      sets: [],
      templateId: fromPlan || 'plan',
    }
    saveActiveSession(sess)
    setActive(sess)
    setTab('today')
    const first = ids[0]
    if (first) {
      const ex = exerciseById(first)
      if (ex) {
        setSelectedEx(first)
        setWeight(40)
        setReps(10)
      }
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
      try {
        if (navigator.vibrate) navigator.vibrate([40, 30, 40])
      } catch {
        /* ignore */
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
    if (exerciseIds?.[0]) {
      pickExercise(exerciseIds[0], sess)
    }
  }

  const pickExercise = (exerciseId: string, sess = active) => {
    const ex = exerciseById(exerciseId)
    if (!ex) return
    setSelectedEx(exerciseId)
    setPickerOpen(false)
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
    try {
      if (navigator.vibrate) navigator.vibrate(18)
    } catch {
      /* ignore */
    }
  }

  const finishSession = () => {
    if (!active) return
    const ended: WorkoutSession = {
      ...active,
      endedAt: new Date().toISOString(),
    }
    const next = [ended, ...sessions]
    setSessions(next)
    saveSessions(next)
    persistActive(null)
    setFinishOpen(true)
    setSelectedEx(null)
    if (user) {
      void (async () => {
        try {
          const supabase = createClient()
          await persistFinishedWorkout(supabase, user.id, ended)
          setCloudNote('呢次訓練已上雲')
        } catch (e) {
          setCloudNote(e instanceof Error ? e.message : '上雲失敗，本機已保存')
        }
      })()
    }
  }

  const discardSession = () => {
    if (!window.confirm('放棄呢次訓練？組數唔會保存。')) return
    persistActive(null)
    setSelectedEx(null)
    setRestRunning(false)
    setRestLeft(null)
  }

  const filtered = useMemo(() => searchExercises(search), [search])

  const [todayDone, setTodayDone] = useState<WorkoutSession[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [sparkline, setSparkline] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [sparkLabels, setSparkLabels] = useState<string[]>(['一','二','三','四','五','六','日'])

  useEffect(() => {
    if (!ready) return
    setTodayDone(sessions.filter((s) => s.endedAt && isSameDay(s.startedAt)))
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
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <div className="h-10 w-40 rounded-2xl bg-border/70 skeleton-pulse" />
          <div className="h-32 rounded-[20px] bg-border/50 skeleton-pulse" />
          <div className="h-48 rounded-[20px] bg-border/40 skeleton-pulse" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted mb-2">訓練</p>
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
              今日爆機未？
            </h1>
            <p className="mt-2 text-sm text-muted max-w-sm">
              一掣加組、自動帶入上次重量——比填表快。
            </p>
          </div>
          {active && !active.endedAt && (
            <div className="shrink-0 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-soft text-right">
              <div className="flex items-center gap-1.5 text-[10px] text-muted justify-end">
                <Clock className="h-3 w-3" />
                進行中
              </div>
              <div className="font-semibold tabular-nums text-lg text-accent leading-tight">
                {formatDuration(elapsed)}
              </div>
            </div>
          )}
        </header>

        {!user && (
          <div className="mb-5">
            <LoginPromptBanner />
          </div>
        )}
        {user && cloudNote && (
          <p className="mb-4 text-[11px] text-muted">{cloudNote}</p>
        )}

        <div className="mb-6 flex gap-1.5 p-1 rounded-2xl bg-[#f0efee] border border-border">
          {(
            [
              { id: 'today' as const, label: '今日', icon: Play },
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
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={springSoft}
              className="space-y-5"
            >
              {!active ? (
                <Stagger className="space-y-4">
                  <StaggerItem>
                    <Card className="overflow-hidden relative">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent-soft),_transparent_55%)] pointer-events-none" />
                      <div className="relative">
                        <CardTitle>未開波？</CardTitle>
                        <CardDesc className="mt-2 mb-5">
                          撳下面開始今日訓練。組間休息、上一組重量會自動跟住你。
                        </CardDesc>
                        <Button size="lg" className="w-full sm:w-auto" onClick={() => startSession()}>
                          <Play className="h-4 w-4" />
                          開始今日訓練
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="py-4">
                        <div className="text-[11px] text-muted mb-1">今日完成</div>
                        <div className="text-2xl font-semibold tabular-nums">{todayDone.length}</div>
                        <div className="text-xs text-muted">次 session</div>
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
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <CardTitle className="text-lg">本週節奏</CardTitle>
                        <Badge tone="muted">容量</Badge>
                      </div>
                      <Sparkline values={sparkline} labels={sparkLabels} />
                    </Card>
                  </StaggerItem>
                </Stagger>
              ) : (
                <div className="space-y-4">
                  {/* Rest timer */}
                  {restLeft != null && (
                    <Card className={cn('py-4', restLeft === 0 && 'ring-2 ring-accent/30')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium">
                            {restLeft === 0 ? '休息完 · 下一組啦' : '組間休息'}
                          </span>
                        </div>
                        <div className="font-semibold tabular-nums text-2xl text-accent">
                          {formatDuration(restLeft)}
                        </div>
                      </div>
                      <ProgressBar
                        className="mt-3"
                        value={restSec - (restLeft || 0)}
                        max={restSec || 1}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
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
                              'rounded-full px-3 py-1 text-xs border transition',
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
                          onClick={() => setRestRunning((v) => !v)}
                          className="rounded-full px-3 py-1 text-xs border border-border text-muted hover:text-foreground inline-flex items-center gap-1"
                        >
                          {restRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {restRunning ? '暫停' : '繼續'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRestLeft(null)
                            setRestRunning(false)
                          }}
                          className="rounded-full px-3 py-1 text-xs border border-border text-muted hover:text-foreground"
                        >
                          跳過
                        </button>
                      </div>
                    </Card>
                  )}

                  {/* Logger */}
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-lg">記一組</CardTitle>
                      <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                        <Search className="h-3.5 w-3.5" />
                        {selectedEx ? exerciseById(selectedEx)?.nameZh : '揀動作'}
                      </Button>
                    </div>

                    {selectedEx ? (
                      <>
                        <div className="mb-4">
                          <div className="font-serif text-2xl tracking-tight">
                            {exerciseById(selectedEx)?.nameZh}
                          </div>
                          <div className="text-xs text-muted mt-0.5">
                            {exerciseById(selectedEx)?.nameEn}
                            {prs[selectedEx] && (
                              <span className="ml-2 text-accent">
                                · PR {prs[selectedEx].weightKg}kg × {prs[selectedEx].reps}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-[11px] text-muted mb-1.5 block">重量 (kg)</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setWeight((w) => Math.max(0, Math.round((w - 2.5) * 2) / 2))}
                                className="h-12 w-12 rounded-2xl border border-border bg-[#fafaf9] text-lg font-medium hover:bg-accent-soft active:scale-95 transition"
                              >
                                −
                              </button>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step={2.5}
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value) || 0)}
                                className="text-center text-lg font-semibold tabular-nums h-12"
                              />
                              <button
                                type="button"
                                onClick={() => setWeight((w) => Math.round((w + 2.5) * 2) / 2)}
                                className="h-12 w-12 rounded-2xl border border-border bg-[#fafaf9] text-lg font-medium hover:bg-accent-soft active:scale-95 transition"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWeight((w) => Math.round((w + 2.5) * 2) / 2)}
                              className="mt-2 w-full text-xs text-accent font-medium py-1.5 rounded-xl hover:bg-accent-soft transition"
                            >
                              +2.5 kg
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] text-muted mb-1.5 block">次數</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReps((r) => Math.max(1, r - 1))}
                                className="h-12 w-12 rounded-2xl border border-border bg-[#fafaf9] text-lg font-medium hover:bg-accent-soft active:scale-95 transition"
                              >
                                −
                              </button>
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={reps}
                                onChange={(e) => setReps(Number(e.target.value) || 1)}
                                className="text-center text-lg font-semibold tabular-nums h-12"
                              />
                              <button
                                type="button"
                                onClick={() => setReps((r) => r + 1)}
                                className="h-12 w-12 rounded-2xl border border-border bg-[#fafaf9] text-lg font-medium hover:bg-accent-soft active:scale-95 transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <motion.div whileTap={reduce ? undefined : { scale: 0.98 }} transition={springSnappy}>
                          <Button size="xl" className="w-full text-base gap-2" onClick={addSet}>
                            <Plus className="h-5 w-5" />
                            ＋1 組 · {weight} kg × {reps}
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="w-full rounded-[20px] border border-dashed border-border py-10 text-sm text-muted hover:border-accent/40 hover:text-accent hover:bg-accent-soft/40 transition"
                      >
                        揀一個動作開始記組
                      </button>
                    )}
                  </Card>

                  {/* Sets list */}
                  {setsByExercise.length > 0 && (
                    <Card className="space-y-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">呢次組數</CardTitle>
                        <Badge tone="accent">
                          {active.sets.length} 組 · {Math.round(volumeOf(active.sets)).toLocaleString()} 容量
                        </Badge>
                      </div>
                      {setsByExercise.map((group) => (
                        <div key={group.id}>
                          <div className="text-sm font-medium mb-2">{group.name}</div>
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

                  <div className="flex gap-2 pt-1">
                    <Button variant="secondary" className="flex-1" onClick={discardSession}>
                      放棄
                    </Button>
                    <Button
                      className="flex-[1.4]"
                      disabled={active.sets.length === 0}
                      onClick={finishSession}
                    >
                      <Flame className="h-4 w-4" />
                      完場
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'templates' && (
            <motion.div
              key="templates"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={springSoft}
            >
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <StaggerItem key={t.id}>
                    <Card hover className="h-full flex flex-col">
                      <CardTitle className="text-xl">{t.name}</CardTitle>
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
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => {
                          if (active && !window.confirm('已有進行中訓練，改用呢個課表？')) return
                          startSession(t.id, t.exerciseIds)
                        }}
                      >
                        用呢個開波
                      </Button>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div
              key="history"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={springSoft}
              className="space-y-4"
            >
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-accent" />
                  <CardTitle className="text-lg">PR 牆</CardTitle>
                </div>
                {Object.keys(prs).length === 0 ? (
                  <p className="text-sm text-muted">未有個人最佳——練完第一組就會喺度出現。</p>
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
                <Card className="text-center py-12">
                  <History className="h-8 w-8 text-muted mx-auto mb-3 opacity-50" />
                  <CardTitle className="text-lg mb-1">仲未有歷史</CardTitle>
                  <CardDesc>完成第一次訓練之後，日曆同容量會喺度慢慢長出來。</CardDesc>
                </Card>
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
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Search className="h-4 w-4 text-muted shrink-0" />
                <Input
                  autoFocus
                  placeholder="搜尋：卧推、深蹲、三頭…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-0 shadow-none focus:ring-0 px-0 h-10"
                />
                <button type="button" onClick={() => setPickerOpen(false)} aria-label="關閉">
                  <X className="h-5 w-5 text-muted" />
                </button>
              </div>
              <ul className="overflow-y-auto p-2 flex-1">
                {(search ? filtered : EXERCISES).map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => pickExercise(ex.id)}
                      className="w-full text-left rounded-2xl px-3 py-3 hover:bg-accent-soft/60 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">{ex.nameZh}</div>
                        <div className="text-[11px] text-muted">
                          {ex.nameEn} · {ex.muscle}
                        </div>
                      </div>
                      {prs[ex.id] && (
                        <span className="text-[11px] text-accent tabular-nums">
                          {prs[ex.id].weightKg}kg
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR toast */}
      <AnimatePresence>
        {prToast && (
          <motion.div
            className="fixed top-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-foreground text-background px-4 py-3 shadow-hover flex items-center gap-2 max-w-[90vw]"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springSoft}
            role="status"
          >
            <Trophy className="h-4 w-4 text-amber-300 shrink-0" />
            <div>
              <div className="text-xs opacity-70">新 PR 🎉</div>
              <div className="text-sm font-medium">{prToast}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish modal */}
      <AnimatePresence>
        {finishOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-[20px] bg-surface border border-border p-6 shadow-hover text-center"
              initial={reduce ? false : { scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={springSoft}
            >
              <div className="text-3xl mb-2">🔥</div>
              <h2 className="font-serif text-2xl mb-2">搞掂！</h2>
              <p className="text-sm text-muted mb-5">
                今日練完啦。歷史同 PR 已經更新——聽日繼續。
              </p>
              <Button className="w-full" onClick={() => setFinishOpen(false)}>
                收工
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
