'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  History,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
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
  TEMPLATES,
  NEWBIE_SEARCH_CHIPS,
  MUSCLE_FILTERS,
  EQUIPMENT_FILTERS,
  exerciseById,
  matchedAliasLabel,
  filterExercises,
  type Equipment,
} from '@/lib/fitness/exercises'
import { ExerciseHowTo, ExerciseHowToHint } from '@/components/fitness/exercise-howto'
import {
  type WorkoutSession,
  type WorkoutSet,
  type SetOutcome,
  loadActiveSession,
  loadPRs,
  loadSessions,
  newId,
  saveActiveSession,
  savePRs,
  saveSessions,
  isSameDay,
  isWarmupSet,
  isWorkingSet,
  todayKey,
} from '@/lib/fitness/storage'
import { persistFinishedWorkout } from '@/lib/fitness/cloud'
import { migrateLocalFitnessToCloud } from '@/lib/fitness/migrate'
import { SyncToast } from '@/components/ui/sync-toast'
import { volumeByDay } from '@/lib/fitness/plan-progress'
import { ShareCardButton } from '@/components/fitness/share-card-button'
import { WeekOneCard } from '@/components/fitness/week-one-card'
import { SyncStatusLine } from '@/components/fitness/sync-status-line'
import {
  evaluateFitnessAchievements,
  unlockFitnessAchievements,
  fitnessAchievementById,
  loadFitnessUnlocked,
} from '@/lib/fitness/achievements'
import { markTrainedToday, streakComebackLine, syncDaysFromSessions, trainedToday, weekConsistency, type WeekDay } from '@/lib/fitness/streaks'
import { WeekDots } from '@/components/fitness/week-dots'
import { TrainHeatmap } from '@/components/fitness/train-heatmap'
import { LiftProgressCard } from '@/components/fitness/lift-progress-card'
import { analyzeWorkout, isTinySession, sessionCountsAsTrainingDay, type WorkoutAnalysis } from '@/lib/fitness/analysis'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import {
  armRestNotification,
  buzzLight,
  buzzRestTick,
  cancelRestAlarm,
  flashDocumentTitle,
  notifyRestDone,
  vibrationAvailable,
} from '@/lib/fitness/haptic'
import { clampRestSeconds, loadRestPrefs, saveRestPrefs } from '@/lib/fitness/rest-prefs'
import { RestTimerControls } from '@/components/fitness/rest-timer-controls'
import { prefillSetForExercise } from '@/lib/fitness/last-set'
import { TrainCalmLine, TrainTipBanner } from '@/components/fitness/train-tip-banner'
import {
  buildBetweenSetTip,
  buildFinishLines,
  buildOpenTip,
  recentAnchors,
  shortExerciseName,
  type TrainTip,
} from '@/lib/fitness/train-tips'
import { loadTrainTipsEnabled, useTrainTipsEnabled } from '@/lib/fitness/train-tips-prefs'
import {
  peekTrainAiQuota,
  rememberTrainAiQuota,
  trainAiLimitCopy,
} from '@/lib/fitness/train-ai-quota'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import {
  requestNotificationPermissionCantonese,
  scheduleLocalPing,
  tomorrowHkLocalEndAt,
  isTomorrowTrainPingScheduled,
  markTomorrowTrainPingScheduled,
  TOMORROW_TRAIN_PING_TAG,
  notificationPermission,
} from '@/lib/pwa/notifications'
import {
  TrainFirstGuide,
  shouldShowTrainFirstGuide,
} from '@/components/fitness/train-first-guide'
import {
  loadTrainSfxEnabled,
  saveTrainSfxEnabled,
  sfxLogSet,
  sfxRestDone,
  sfxRestTick,
} from '@/lib/fitness/train-sfx'
import {
  DEFAULT_WEEKLY_PPL,
  SCHEDULE_PRESETS,
  applySchedulePreset,
  getTodayPlanHint,
  loadCustomDayPlans,
  loadWeeklySchedule,
  saveWeeklySchedule,
  moveWeeklySlot,
  saveTemplateAsCustom,
  deleteCustomDayPlan,
  computeWeeklySlotProgress,
  type CustomDayPlan,
  type TodayPlanHint,
  type WeeklySlotProgress,
} from '@/lib/fitness/saved-plans'
import { ActivePlanPanel } from '@/components/fitness/active-plan-panel'
import { WeeklyPresets } from '@/components/fitness/weekly-presets'
import { suggestSubstitutes } from '@/lib/fitness/substitutes'
import { loadHowtoFavs } from '@/lib/fitness/howto-favs'
import { CustomPlanBuilder } from '@/components/fitness/custom-plan-builder'
import { hydrateActivePlanFromCloud, loadActivePlan } from '@/lib/fitness/plan-store'
import {
  enqueueWorkout,
  flushOfflineQueue,
} from '@/lib/fitness/offline-queue'
import { offlineDrainToastMessage } from '@/lib/fitness/offline-drain'
import { offerNextPlanExercise } from '@/lib/fitness/plan-queue'
import { LoginPromptBanner } from '@/components/auth/login-card'
import { MeetupBoard } from '@/components/fitness/meetup-board'
import { buildTrainCoachBlurb } from '@/lib/fitness/weekly-summary'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PlateHint } from '@/components/fitness/plate-hint'

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

function draftKg(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function draftReps(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function volumeOf(sets: WorkoutSet[]) {
  return sets.reduce((a, s) => (isWorkingSet(s) ? a + s.weightKg * s.reps : a), 0)
}

function workingSetLabel(sets: WorkoutSet[], setId: string) {
  let n = 0
  for (const s of sets) {
    if (isWarmupSet(s)) {
      if (s.id === setId) return '熱'
      continue
    }
    n += 1
    if (s.id === setId) return `#${n}`
  }
  return '#'
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
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null)
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [restSec, setRestSec] = useState(90)
  const [restAutoStart, setRestAutoStart] = useState(true)
  const [canVibrate, setCanVibrate] = useState(false)
  const [draftNote, setDraftNote] = useState<string | null>(null)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restRunning, setRestRunning] = useState(false)
  const [prToast, setPrToast] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [lastFinished, setLastFinished] = useState<WorkoutSession | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<WorkoutAnalysis | null>(null)
  const [tomorrowPingBusy, setTomorrowPingBusy] = useState(false)
  const [tomorrowPingMsg, setTomorrowPingMsg] = useState<string | null>(null)
  const [tomorrowPingSet, setTomorrowPingSet] = useState(false)
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
  /** False while kg/reps still match the auto-fill, so a later sync can refresh them. */
  const draftTouched = useRef(false)
  const loggerRef = useRef<HTMLDivElement>(null)
  const restEndedFocus = useRef(false)
  const [restReadyNext, setRestReadyNext] = useState(false)
  const tipsOn = useTrainTipsEnabled()
  const [betweenTip, setBetweenTip] = useState<TrainTip | null>(null)
  const [openDismissedEx, setOpenDismissedEx] = useState<string | null>(null)
  const [askBusy, setAskBusy] = useState(false)
  const [askLine, setAskLine] = useState<string | null>(null)
  const [askNote, setAskNote] = useState<string | null>(null)
  const [finishLines, setFinishLines] = useState<string[]>([])
  const [sfxOn, setSfxOn] = useState(true)
  const [restFullscreen, setRestFullscreen] = useState(true)
  const [pendingOutcome, setPendingOutcome] = useState<SetOutcome>('ok')
  const [exerciseToolsOpen, setExerciseToolsOpen] = useState(false)
  const [prChallengeOpen, setPrChallengeOpen] = useState(false)

  const applyPrefill = useCallback(
    (
      exerciseId: string,
      sess: WorkoutSession | null,
      history: WorkoutSession[],
      opts?: { resetOutcome?: boolean }
    ) => {
      draftTouched.current = false
      const found = prefillSetForExercise(history, exerciseId, sess)
      if (found) {
        setWeight(String(found.set.weightKg))
        setReps(String(found.set.reps))
      } else {
        setWeight('')
        setReps('')
      }
      if (opts?.resetOutcome) setPendingOutcome('ok')
    },
    []
  )

  const markDraftEdited = () => {
    draftTouched.current = true
  }

  const [showFirstGuide, setShowFirstGuide] = useState(false)
  const [howtoFavs, setHowtoFavs] = useState<string[]>([])
  const [landscapeLog, setLandscapeLog] = useState(false)
  const [avoidEquip, setAvoidEquip] = useState<Equipment | null>(null)

  // Derived / secondary state — must stay above ready/authReady gate (React #310)
  const [todayDone, setTodayDone] = useState<WorkoutSession[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [historyCurve, setHistoryCurve] = useState<{ key: string; label: string; volume: number }[]>([])
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekTrainCount, setWeekTrainCount] = useState(0)
  const [streak, setStreak] = useState(0)

  const filtered = useMemo(
    () =>
      filterExercises({
        query: search,
        muscle: muscleFilter,
        equipment: equipmentFilter,
      }),
    [search, muscleFilter, equipmentFilter]
  )

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

  const coachTip = useMemo(
    () => buildTrainCoachBlurb(sessions).lines[0] || '',
    [sessions]
  )

  const openTip = useMemo(() => {
    if (!tipsOn || !selectedEx || !active || active.endedAt) return null
    if (active.sets.some((s) => s.exerciseId === selectedEx)) return null
    const ex = exerciseById(selectedEx)
    const name = ex ? shortExerciseName(ex.nameZh, ex.nameEn) : '呢個動作'
    return buildOpenTip({
      exerciseId: selectedEx,
      name,
      sessions,
      activeId: active.id,
    })
  }, [tipsOn, selectedEx, active, sessions])

  const subTips = useMemo(() => {
    if (!selectedEx) return []
    return suggestSubstitutes(selectedEx, {
      avoidEquipment: avoidEquip || undefined,
      preferEquipment: equipmentFilter,
      limit: 3,
    })
  }, [selectedEx, avoidEquip, equipmentFilter])

  useEffect(() => {
    const s = loadSessions()
    setSessions(s)
    setPrs(loadPRs())
    const a = loadActiveSession()
    setActive(a)
    const prefs = loadRestPrefs()
    setRestSec(prefs.seconds)
    setRestAutoStart(prefs.autoStart)
    setCanVibrate(vibrationAvailable())
    if (a && !a.endedAt && a.sets.length > 0) {
      setDraftNote(`已還原未完場草稿 · ${a.sets.length} 組喺呢部機`)
    }
    setSfxOn(loadTrainSfxEnabled())
    setHowtoFavs(loadHowtoFavs())
    const tips = loadTrainTipsEnabled()
    if (a && !a.endedAt) {
      const last = a.sets[a.sets.length - 1]
      if (last) {
        setSelectedEx(last.exerciseId)
        if (tips) {
          const ex = exerciseById(last.exerciseId)
          setBetweenTip(
            buildBetweenSetTip({
              exerciseId: last.exerciseId,
              name: ex ? shortExerciseName(ex.nameZh, ex.nameEn) : last.exerciseName,
              logged: last,
              activeSets: a.sets,
              sessions: s,
              activeId: a.id,
            })
          )
        }
      }
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!active || active.endedAt) return
    const flush = () => saveActiveSession(active)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [active])

  useEffect(() => {
    if (!pickerOpen) return
    setHowtoFavs(loadHowtoFavs())
  }, [pickerOpen])

  // 橫屏記組：矮高度 landscape 自動開；亦可手動
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 520px)')
    const apply = () => setLandscapeLog(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    if (!finishOpen) return
    setTomorrowPingMsg(null)
    setTomorrowPingBusy(false)
    setTomorrowPingSet(isTomorrowTrainPingScheduled())
  }, [finishOpen])

  useEffect(() => {
    if (!ready) return
    setTodayHint(getTodayPlanHint(sessions))
    setCustomPlans(loadCustomDayPlans())
    setWeekSlots(loadWeeklySchedule())
    setWeekProgress(computeWeeklySlotProgress(sessions))
    setTodayDone(sessions.filter((s) => sessionCountsAsTrainingDay(s) && isSameDay(s.startedAt)))
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
    setHistoryCurve(volumeByDay(sessions, 14))
  }, [sessions, ready])

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
        if (!cancelled) setCloudNote(e instanceof Error ? e.message : '訓練同步唔到')
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

  // Flush offline queue when back online / on login — toast when drain succeeds
  useEffect(() => {
    if (!user) return
    const flush = async () => {
      try {
        const supabase = createClient()
        const flushed = await flushOfflineQueue(supabase, user.id)
        if (flushed.note) setCloudNote(flushed.note)
        const toast = offlineDrainToastMessage(flushed.ok)
        if (toast) setSyncToast(toast)
      } catch {
        /* ignore */
      }
    }
    void flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [user])




  // One-tap start from plan (?exercises=), template (?template=), or replay last (?replay=1)
  useEffect(() => {
    if (!ready) return
    const raw = searchParams.get('exercises')
    const fromPlan = searchParams.get('plan')
    const templateQ = searchParams.get('template')
    const replayQ = searchParams.get('replay')
    if (!raw && !templateQ && replayQ !== '1') return

    const existing = loadActiveSession()
    if (existing && !existing.endedAt && existing.sets.length > 0) {
      setActive(existing)
      setTab('today')
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('exercises')
        url.searchParams.delete('plan')
        url.searchParams.delete('template')
        url.searchParams.delete('replay')
        window.history.replaceState({}, '', url.pathname)
      } catch {
        /* ignore */
      }
      return
    }

    let ids: string[] = []
    let templateId: string | undefined

    if (replayQ === '1') {
      const last = loadSessions().find((s) => s.endedAt && s.sets.length > 0)
      if (last) {
        for (const set of last.sets) {
          if (!ids.includes(set.exerciseId) && exerciseById(set.exerciseId)) ids.push(set.exerciseId)
        }
        templateId = last.templateId
      }
    }

    if (!ids.length && templateQ) {
      const tpl = TEMPLATES.find((t) => t.id === templateQ)
      if (tpl) {
        ids = tpl.exerciseIds.filter((id) => !!exerciseById(id))
        templateId = tpl.id
      }
    }

    if (!ids.length && raw) {
      ids = raw.split(',').map((x) => x.trim()).filter(Boolean).filter((id) => !!exerciseById(id))
      templateId = fromPlan ? `plan:${fromPlan}` : 'plan'
    }

    if (ids.length === 0) return

    setPlanQueue(ids)
    const sess: WorkoutSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      sets: [],
      templateId,
    }
    saveActiveSession(sess)
    setActive(sess)
    setTab('today')
    const first = ids[0]
    if (first) {
      setSelectedEx(first)
      applyPrefill(first, sess, loadSessions(), { resetOutcome: true })
    }
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('exercises')
      url.searchParams.delete('plan')
      url.searchParams.delete('template')
      url.searchParams.delete('replay')
      window.history.replaceState({}, '', url.pathname)
    } catch {
      /* ignore */
    }
  }, [ready, searchParams, applyPrefill])

  // Cloud hydrate can arrive after the first paint. Refresh untouched kg/reps.
  useEffect(() => {
    if (!ready || !selectedEx || draftTouched.current) return
    applyPrefill(selectedEx, active, sessions)
  }, [ready, selectedEx, sessions, active, applyPrefill])

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
      sfxRestDone()
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
    if (restLeft <= 3 && restLeft > 0) {
      sfxRestTick()
      buzzRestTick()
    }
    const id = window.setTimeout(() => setRestLeft((v) => (v == null ? v : v - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [restRunning, restLeft])

  const persistActive = useCallback((next: WorkoutSession | null) => {
    setActive(next)
    saveActiveSession(next)
  }, [])

  const startSession = (templateId?: string, exerciseIds?: string[]) => {
    if (shouldShowTrainFirstGuide()) setShowFirstGuide(true)
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

  /** Hevy／Strong 風格：照上一場動作順序再開，重量／次數自動帶入。 */
  const startFromSession = (s: WorkoutSession) => {
    if (active && active.sets.length > 0) {
      const ok = window.confirm('而家有進行中嘅訓練。放棄佢，改做呢場？')
      if (!ok) return
    }
    const ids: string[] = []
    for (const set of s.sets) {
      if (!ids.includes(set.exerciseId) && exerciseById(set.exerciseId)) ids.push(set.exerciseId)
    }
    if (!ids.length) {
      startSession(s.templateId)
      return
    }
    startSession(s.templateId, ids)
    setSavedToast('已套用上一場動作 · 重量會自動帶入')
    window.setTimeout(() => setSavedToast(null), 2600)
  }

  const pickExercise = (exerciseId: string, sess = active) => {
    const ex = exerciseById(exerciseId)
    if (!ex) return
    setSelectedEx(exerciseId)
    setPickerOpen(false)
    setPickerHowtoId(null)
    setSearch('')
    setExerciseToolsOpen(false)
    setPrChallengeOpen(false)
    setRestReadyNext(false)
    applyPrefill(exerciseId, sess ?? null, sessions, { resetOutcome: true })
    setBetweenTip(null)
    setAskLine(null)
    setAskNote(null)
  }

  const startDemoLegDay = () => {
    const t = TEMPLATES.find((x) => x.id === 'newbie-leg-day')
    if (!t) return
    startSession(t.id, t.exerciseIds)
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

  const rememberRest = (seconds: number) => {
    const next = clampRestSeconds(seconds)
    setRestSec(next)
    saveRestPrefs({ seconds: next })
    return next
  }

  const armOrHoldRest = (seconds: number) => {
    const dur = rememberRest(seconds)
    setRestLeft(dur)
    setRestReadyNext(false)
    restEndedFocus.current = false
    if (restAutoStart) {
      setRestRunning(true)
      setRestFullscreen(true)
      void armRestNotification(dur)
    } else {
      setRestRunning(false)
      setRestFullscreen(false)
      cancelRestAlarm()
    }
  }

  const pickRestDuration = (seconds: number) => {
    const next = rememberRest(seconds)
    setRestLeft(next)
    setRestRunning(true)
    setRestReadyNext(false)
    void armRestNotification(next)
  }

  const adjustRest = (delta: number) => {
    const base = restLeft ?? restSec
    const nextLeft = Math.max(0, Math.min(300, base + delta))
    rememberRest(restSec + delta)
    setRestLeft(nextLeft)
    setRestRunning(true)
    if (nextLeft > 0) void armRestNotification(nextLeft)
    else cancelRestAlarm()
  }

  const skipRest = () => {
    setRestLeft(null)
    setRestRunning(false)
    setRestFullscreen(false)
    setRestReadyNext(true)
    cancelRestAlarm()
    window.setTimeout(() => {
      loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      weightRef.current?.focus()
      weightRef.current?.select()
    }, 50)
  }

  const toggleRestRun = () => {
    if (restRunning) {
      setRestRunning(false)
      cancelRestAlarm()
      return
    }
    const left = restLeft ?? restSec
    setRestRunning(true)
    setRestFullscreen(true)
    if (left > 0) void armRestNotification(left)
  }

  const toggleRestAuto = () => {
    setRestAutoStart((v) => {
      const next = !v
      saveRestPrefs({ autoStart: next })
      return next
    })
  }

  const clearAsk = () => {
    setAskLine(null)
    setAskNote(null)
  }

  const noteLoggedSet = (row: WorkoutSet, nextActive: WorkoutSession) => {
    clearAsk()
    if (!loadTrainTipsEnabled()) {
      setBetweenTip(null)
      return
    }
    const ex = exerciseById(row.exerciseId)
    setBetweenTip(
      buildBetweenSetTip({
        exerciseId: row.exerciseId,
        name: ex ? shortExerciseName(ex.nameZh, ex.nameEn) : row.exerciseName,
        logged: row,
        activeSets: nextActive.sets,
        sessions,
        activeId: nextActive.id,
      })
    )
  }

  const dismissTip = (tip: TrainTip) => {
    clearAsk()
    if (tip.id.startsWith('between:')) setBetweenTip(null)
    else if (selectedEx) setOpenDismissedEx(selectedEx)
  }

  const acceptTip = (tip: TrainTip) => {
    if (typeof tip.suggestedWeightKg === 'number') {
      markDraftEdited()
      setWeight(String(tip.suggestedWeightKg))
      window.setTimeout(() => {
        weightRef.current?.focus()
        weightRef.current?.select()
      }, 30)
    }
    dismissTip(tip)
  }

  const askTip = async (kind: 'open' | 'between') => {
    if (!selectedEx || !active) return
    const quota = peekTrainAiQuota()
    if (quota.remaining <= 0) {
      setAskLine(null)
      setAskNote(trainAiLimitCopy(quota.limit))
      return
    }
    setAskBusy(true)
    setAskNote(null)
    const ex = exerciseById(selectedEx)
    const name = ex ? shortExerciseName(ex.nameZh, ex.nameEn) : '呢個動作'
    const recent = recentAnchors(sessions, selectedEx, active.id).map((set) => ({
      weightKg: set.weightKg,
      reps: set.reps,
      outcome: set.outcome,
    }))
    const today = active.sets
      .filter((set) => set.exerciseId === selectedEx)
      .map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        outcome: set.outcome,
      }))
    try {
      const res = await fetch('/api/train/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, exerciseId: selectedEx, name, recent, today }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        line?: string
        message?: string
        day?: string
        used?: number
        limit?: number
        remaining?: number
      }
      if (typeof data.used === 'number' && data.day && typeof data.limit === 'number') {
        rememberTrainAiQuota({ day: data.day, used: data.used, limit: data.limit })
      }
      if (!res.ok || !data.ok || typeof data.line !== 'string') {
        setAskLine(null)
        setAskNote(data.message || trainAiLimitCopy(data.limit || quota.limit))
        return
      }
      setAskLine(data.line)
      setAskNote(
        typeof data.remaining === 'number' && data.remaining > 0
          ? `按紀錄講 · 今日仲可問 ${data.remaining} 次`
          : trainAiLimitCopy(data.limit || quota.limit)
      )
    } catch {
      setAskNote('而家上網唔到。小提示仍然用你部機嘅紀錄。')
    } finally {
      setAskBusy(false)
    }
  }

  const addSet = (outcome: SetOutcome = pendingOutcome) => {
    if (!active || !selectedEx) return
    const weightKg = draftKg(weight)
    const repsN = draftReps(reps)
    if (weightKg == null || repsN == null || weightKg < 0 || repsN < 1) return
    const ex = exerciseById(selectedEx)
    if (!ex) return
    const setIndex = active.sets.filter((s) => s.exerciseId === selectedEx).length + 1
    const row: WorkoutSet = {
      id: newId(),
      exerciseId: selectedEx,
      exerciseName: ex.nameZh,
      setIndex,
      weightKg,
      reps: repsN,
      restSec,
      completedAt: new Date().toISOString(),
      outcome,
    }
    const next = { ...active, sets: [...active.sets, row] }
    persistActive(next)

    // PR check: heaviest weight for exercise（熱身唔計）
    const prev = prs[selectedEx]
    const better =
      outcome !== 'warmup' &&
      weightKg > 0 &&
      (!prev || weightKg > prev.weightKg || (weightKg === prev.weightKg && repsN > prev.reps))
    if (better) {
      const nextPrs = {
        ...prs,
        [selectedEx]: { weightKg, reps: repsN, at: row.completedAt },
      }
      setPrs(nextPrs)
      savePRs(nextPrs)
      if (prev) {
        setPrToast(`${ex.nameZh} · ${weightKg} kg × ${repsN}`)
        window.setTimeout(() => setPrToast(null), 2800)
      }
    }

    setJustAdded(row.id)
    window.setTimeout(() => setJustAdded(null), 500)

    setPendingOutcome('ok')
    buzzLight()
    sfxLogSet()
    noteLoggedSet(row, next)
    armOrHoldRest(restSec)
  }

  const cycleSetOutcome = (setId: string) => {
    if (!active) return
    const order: SetOutcome[] = ['ok', 'half', 'fail', 'warmup']
    const nextSets = active.sets.map((s) => {
      if (s.id !== setId) return s
      const cur = s.outcome || 'ok'
      const i = order.indexOf(cur)
      return { ...s, outcome: order[(i + 1) % order.length] }
    })
    persistActive({ ...active, sets: nextSets })
  }

  const bumpWeight = (delta: number) => {
    markDraftEdited()
    setWeight((w) => {
      const cur = draftKg(w)
      if (cur == null) return delta > 0 ? String(delta) : w
      return String(Math.max(0, Math.round((cur + delta) * 4) / 4))
    })
  }

  const repeatLastSet = () => {
    if (!active || !selectedEx) return
    const prev = prefillSetForExercise(sessions, selectedEx, active)?.set
    if (!prev) return
    setWeight(String(prev.weightKg))
    setReps(String(prev.reps))
    draftTouched.current = false
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
      outcome: prev.outcome || 'ok',
    }
    const next = { ...active, sets: [...active.sets, row] }
    persistActive(next)
    const prPrev = prs[selectedEx]
    const better =
      prev.weightKg > 0 &&
      (!prPrev ||
        prev.weightKg > prPrev.weightKg ||
        (prev.weightKg === prPrev.weightKg && prev.reps > prPrev.reps))
    if (better) {
      const nextPrs = {
        ...prs,
        [selectedEx]: { weightKg: prev.weightKg, reps: prev.reps, at: row.completedAt },
      }
      setPrs(nextPrs)
      savePRs(nextPrs)
      if (prPrev) {
        setPrToast(`${ex.nameZh} · ${prev.weightKg} kg × ${prev.reps}`)
        window.setTimeout(() => setPrToast(null), 2800)
      }
    }
    setJustAdded(row.id)
    window.setTimeout(() => setJustAdded(null), 500)
    buzzLight()
    sfxLogSet()
    noteLoggedSet(row, next)
    armOrHoldRest(restSec)
  }

  const scheduleTomorrowTrainPing = async () => {
    if (tomorrowPingBusy || tomorrowPingSet) return
    setTomorrowPingBusy(true)
    setTomorrowPingMsg(null)
    try {
      let perm = notificationPermission()
      if (perm !== 'granted') {
        perm = await requestNotificationPermissionCantonese()
      }
      if (perm === 'denied') {
        setTomorrowPingMsg('你拒絕咗通知')
        return
      }
      if (perm === 'unsupported' || perm !== 'granted') {
        setTomorrowPingMsg('開唔到通知——可以裝 PWA 再試')
        return
      }
      const { endAt, dayKey } = tomorrowHkLocalEndAt(10)
      const body =
        streak > 0
          ? `連練 ${streak} 日——返嚟 Talk tgt la 記組`
          : '返嚟 Talk tgt la 記組'
      await scheduleLocalPing({
        endAt,
        title: '開台喇 · 續連練',
        body,
        tag: TOMORROW_TRAIN_PING_TAG,
        url: '/train',
      })
      markTomorrowTrainPingScheduled(dayKey)
      setTomorrowPingSet(true)
      setTomorrowPingMsg('聽日 10:00 會提你')
    } catch {
      setTomorrowPingMsg('開唔到通知——可以裝 PWA 再試')
    } finally {
      setTomorrowPingBusy(false)
    }
  }

  const finishSession = () => {

    if (!active) return
    setConfirmFinish(false)
    setRestRunning(false)
    setRestLeft(null)
    setRestFullscreen(false)
    setRestReadyNext(false)
    cancelRestAlarm()
    const endedAt = new Date().toISOString()
    const draft: WorkoutSession = {
      ...active,
      endedAt,
    }
    const analysis = analyzeWorkout(draft, sessions)
    const tiny = isTinySession(draft.sets)
    const countsAsDay = analysis.countsAsDay !== false
    const ended: WorkoutSession = { ...draft, analysis, countsAsDay }
    setFinishLines(
      countsAsDay && loadTrainTipsEnabled()
        ? buildFinishLines(ended, sessions)
        : analysis.tips.slice(0, 1)
    )
    setBetweenTip(null)
    clearAsk()
    setOpenDismissedEx(null)
    const next = [ended, ...sessions]
    setSessions(next)
    saveSessions(next)
    persistActive(null)
    setLastFinished(ended)
    setLastAnalysis(analysis)
    setFinishOpen(true)
    setSelectedEx(null)
    if (countsAsDay) markTrainedToday(ended.endedAt)
    syncDaysFromSessions(next)
    if (user) {
      void (async () => {
        try {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueWorkout(ended)
            setCloudNote('未有網，先記喺機度')
            return
          }
          const supabase = createClient()
          await persistFinishedWorkout(supabase, user.id, ended)
          setCloudNote('同步去你帳戶')
        } catch {
          enqueueWorkout(ended)
          setCloudNote('同步唔到，先記喺機度')
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
      const announce = newly.filter((id) => !(tiny && id === 'first_workout'))
      if (announce.length) {
        unlockFitnessAchievements(announce)
        const a = fitnessAchievementById(announce[0])
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
    setConfirmFinish(false)
    persistActive(null)
    setSelectedEx(null)
    setRestRunning(false)
    setRestLeft(null)
    setRestFullscreen(false)
    setRestReadyNext(false)
    setDraftNote(null)
    setBetweenTip(null)
    clearAsk()
    setOpenDismissedEx(null)
    setFinishLines([])
    cancelRestAlarm()
  }

  if (!ready || !authReady) {
    return (
      <AppShell>
        <PageSkeleton wide />
      </AppShell>
    )
  }

  const prefill = selectedEx ? prefillSetForExercise(sessions, selectedEx, active) : null
  const lastLoggedForSelected = prefill?.set ?? null
  const weightN = draftKg(weight)
  const repsN = draftReps(reps)
  const usingLast =
    !!lastLoggedForSelected &&
    weightN === lastLoggedForSelected.weightKg &&
    repsN === lastLoggedForSelected.reps
  const prefillHint = usingLast ? (prefill?.source === 'active' ? '用返上一組' : '用返上次') : null
  const logFigures =
    weightN != null && repsN != null && weightN >= 0 && repsN >= 1 ? `${weightN}×${repsN}` : ''

  const setsForSelected =
    active && selectedEx
      ? active.sets.filter((s) => s.exerciseId === selectedEx).length
      : 0
  const nextOffer = offerNextPlanExercise({
    queue: planQueue,
    selectedId: selectedEx,
    setsForSelected,
  })
  const nextPlanExercise = nextOffer?.nextId ?? null
  const sessionLive = Boolean(active && !active.endedAt)
  const openVisible =
    tipsOn && !betweenTip && openTip && openDismissedEx !== selectedEx ? openTip : null
  const betweenVisible = tipsOn && betweenTip ? betweenTip : null
  const restOnScreen = restLeft != null
  const calmAfterRest =
    restOnScreen
      ? null
      : betweenVisible
        ? askLine || betweenVisible.lines[0] || null
        : restReadyNext
          ? `休息完 · 第 ${setsForSelected + 1} 組`
          : null
  const tipBanner = (tip: TrainTip) => (
    <TrainTipBanner
      lines={tip.lines}
      suggestedWeightKg={tip.suggestedWeightKg}
      askLine={askLine}
      askNote={askNote}
      askBusy={askBusy}
      onAccept={typeof tip.suggestedWeightKg === 'number' ? () => acceptTip(tip) : undefined}
      onIgnore={() => dismissTip(tip)}
      onAsk={() => void askTip(tip.id.startsWith('between:') ? 'between' : 'open')}
    />
  )

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <PageHeader
          compact
          eyebrow="訓練"
          title="今日練咩？"
          description={
            active && !active.endedAt
              ? '記一組，休息完再記下一組。'
              : '免費記組——完場可分享 Threads。'
          }
          trailing={
            active && !active.endedAt ? (
              <div className="shrink-0 rounded-2xl border border-border/80 bg-surface px-3 py-2 shadow-soft text-right">
                <div className="flex items-center gap-1.5 text-[10px] text-muted justify-end">
                  <Clock className="h-3 w-3" />
                  練緊
                </div>
                <div className="font-semibold tabular-nums text-base text-accent leading-tight">
                  {formatDuration(elapsed)}
                </div>
                <div className="text-[10px] text-muted tabular-nums mt-0.5">
                  {active.sets.length} 組 · {Math.round(volumeOf(active.sets)).toLocaleString()} kg
                </div>
              </div>
            ) : undefined
          }
        />

        <div className="mb-3 flex gap-1.5 p-1 rounded-2xl bg-surface-muted border border-border">
          {(
            [
              { id: 'today' as const, label: '今日', icon: Play },
              { id: 'meetup' as const, label: '湊局', icon: Users },
              { id: 'templates' as const, label: '課表', icon: Sparkles },
              { id: 'history' as const, label: '歷史', icon: History },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              data-testid={`train-tab-${id}`}
              disabled={sessionLive && id !== 'today'}
              title={sessionLive && id !== 'today' ? '練緊。完場或放棄先轉去第度。' : undefined}
              onClick={() => {
                if (sessionLive && id !== 'today') return
                setTab(id)
              }}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors',
                tab === id ? 'text-accent' : 'text-muted hover:text-foreground',
                sessionLive && id !== 'today' && 'opacity-40 cursor-not-allowed hover:text-muted'
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
              className="space-y-3"
            >
              {!active ? (
                <Stagger className="space-y-3">
                  {/* ① 第一屏：今日課表先係實心主掣。示範腿日只係字掣。 */}
                  <StaggerItem>
                    {loadActivePlan()?.plan?.days?.length ? (
                      <div className="space-y-1.5">
                        <ActivePlanPanel
                          compact
                          refreshKey={planRefreshKey}
                          onStartDay={(title, ids) => {
                            startSession(`plan:${title}`, ids)
                          }}
                        />
                        <div className="flex flex-wrap gap-x-3 gap-y-1 px-0.5">
                          <button
                            type="button"
                            onClick={() => startSession()}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            空手開波
                          </button>
                          <button
                            type="button"
                            onClick={() => setTab('templates')}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            改課表
                          </button>
                          <button
                            type="button"
                            data-testid="demo-leg-link"
                            onClick={startDemoLegDay}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            示範腿日
                          </button>
                        </div>
                      </div>
                    ) : todayHint ? (
                      <Card
                        className={
                          todayHint.doneToday
                            ? 'py-3.5 border-border'
                            : 'py-3.5 border-accent/40 bg-gradient-to-br from-accent-soft/80 via-surface to-surface ring-1 ring-accent/25'
                        }
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-wide text-accent mb-0.5">
                              今日做咩
                            </p>
                            <CardTitle className="text-lg leading-snug">
                              {todayHint.slot.templateId
                                ? `${todayHint.slot.label}`
                                : `休息日 · 星期${todayHint.slot.nameZh}`}
                            </CardTitle>
                          </div>
                          <Badge tone={todayHint.doneToday ? 'muted' : 'accent'}>
                            {todayHint.doneToday
                              ? '今日✓'
                              : `${todayHint.weekDone}/${todayHint.weekTotal}`}
                          </Badge>
                        </div>
                        <CardDesc className="mb-3 text-[12px] line-clamp-2">
                          {todayHint.nextLabel}
                          {coachTip ? ` · ${coachTip}` : ''}
                        </CardDesc>
                        {todayHint.template && !todayHint.doneToday && (
                          <Button
                            size="lg"
                            className="w-full touch-manipulation h-12 text-base"
                            onClick={() =>
                              startSession(
                                todayHint.template!.id,
                                todayHint.template!.exerciseIds
                              )
                            }
                          >
                            <Play className="h-5 w-5" />
                            開波 · {todayHint.template.name}
                          </Button>
                        )}
                        {todayHint.doneToday && (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                size="lg"
                                className="flex-1 touch-manipulation h-12"
                                onClick={() => startSession()}
                              >
                                <Play className="h-4 w-4" />
                                再練一場
                              </Button>
                              <Button
                                size="lg"
                                variant="secondary"
                                className="flex-1 h-12"
                                onClick={() => setTab('templates')}
                              >
                                睇課表
                              </Button>
                            </div>
                            {sessions[0] && sessions[0].sets.length > 0 && (
                              <Button
                                size="lg"
                                variant="secondary"
                                className="w-full touch-manipulation h-11"
                                onClick={() => startFromSession(sessions[0])}
                              >
                                <RotateCcw className="h-4 w-4" />
                                再做上一場 · {TEMPLATES.find((t) => t.id === sessions[0].templateId)?.name || '自由練'}
                              </Button>
                            )}
                          </div>
                        )}
                        {!todayHint.template && !todayHint.doneToday && (
                          <div className="flex gap-2">
                            <Button
                              size="lg"
                              className="flex-1 touch-manipulation h-12"
                              onClick={() => {
                                const t = TEMPLATES.find((x) => x.id === 'fullbody')
                                if (t) startSession(t.id, t.exerciseIds)
                                else startSession()
                              }}
                            >
                              <Play className="h-5 w-5" />
                              開波 · 輕全身
                            </Button>
                            <Button
                              size="lg"
                              variant="secondary"
                              className="flex-1 h-12"
                              onClick={() => setTab('templates')}
                            >
                              改課表
                            </Button>
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {todayHint.template && !todayHint.doneToday && (
                            <button
                              type="button"
                              onClick={() => startSession()}
                              className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                            >
                              空手開波
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setTab('templates')}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            全日課表 →
                          </button>
                          {todayHint.template?.id !== 'newbie-leg-day' && (
                            <button
                              type="button"
                              data-testid="demo-leg-link"
                              onClick={startDemoLegDay}
                              className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                            >
                              示範腿日
                            </button>
                          )}
                        </div>
                      </Card>
                    ) : (
                      <Card className="py-3.5 border-accent/35 bg-gradient-to-br from-accent-soft/70 via-surface to-surface ring-1 ring-accent/20">
                        <p className="text-[10px] font-semibold tracking-wide text-accent mb-0.5">
                          今日做咩
                        </p>
                        <CardTitle className="text-lg mb-1">自由練開波</CardTitle>
                        <CardDesc className="mb-3 text-[12px]">
                          撳開波，再喺下面搵動作記組。
                        </CardDesc>
                        <Button
                          size="lg"
                          className="w-full touch-manipulation h-12 text-base"
                          onClick={() => startSession()}
                        >
                          <Play className="h-5 w-5" />
                          開波
                        </Button>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => setTab('templates')}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            或者先揀課表 →
                          </button>
                          <button
                            type="button"
                            data-testid="demo-leg-link"
                            onClick={startDemoLegDay}
                            className="text-[11px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            示範腿日
                          </button>
                        </div>
                      </Card>
                    )}
                  </StaggerItem>

                  <StaggerItem>
                    <WeekOneCard
                      variant="workout"
                      finishedWorkouts={sessions.filter((s) => s.endedAt).length}
                      hkQuickMeals={0}
                    />
                  </StaggerItem>

                  {/* ② 搵動作：扁卡，盡量同 CTA 同屏 */}
                  <StaggerItem>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-soft">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold">搵動作</span>
                        <button
                          type="button"
                          onClick={() => {
                            startSession()
                            setSearch('')
                            setPickerOpen(true)
                            setPickerHowtoId(null)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent touch-manipulation"
                        >
                          <Search className="h-3.5 w-3.5" />
                          開動作庫
                        </button>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
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
                            className="shrink-0 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft touch-manipulation"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </StaggerItem>

                  {/* ③ 進度：矮一排 */}
                  <StaggerItem>
                    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-soft">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Flame className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span
                            className="text-sm font-semibold truncate"
                            title={streak > 0 ? '聽日再練就續到條連練' : '完場之後先計連練'}
                          >
                            {streak > 0 ? `連練 ${streak} 日` : `本週 ${weekTrainCount}/7`}
                          </span>
                          <span className="text-[10px] text-muted truncate">
                            · {streak > 0 ? '聽日再嚟就續' : '完一場就開始計'} · 今日 {todayDone.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTab('history')}
                          className="shrink-0 text-[11px] font-semibold text-accent touch-manipulation"
                        >
                          歷史 →
                        </button>
                      </div>
                      <WeekDots days={weekDays} />
                    </div>
                  </StaggerItem>
                </Stagger>
              ) : (
                <div className="space-y-4">
                  {draftNote && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 px-3.5 py-2.5">
                      <p className="text-[12px] text-accent leading-relaxed">{draftNote}</p>
                      <button
                        type="button"
                        onClick={() => setDraftNote(null)}
                        className="shrink-0 text-[11px] font-medium text-accent touch-manipulation"
                      >
                        知喇
                      </button>
                    </div>
                  )}
                  {openVisible && tipBanner(openVisible)}
                  {(active.sets.length === 0 || sessions.filter((s) => s.endedAt).length === 0) && (
                    <div className="rounded-2xl border border-accent/25 bg-accent-soft/25 px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Badge tone="accent">首次</Badge>
                      <span className="text-[12px] text-muted">
                        <span className={selectedEx ? 'text-accent font-semibold' : 'font-medium text-foreground'}>
                          1 揀動作
                        </span>
                        {' → '}
                        <span className={active.sets.length > 0 ? 'text-accent font-semibold' : ''}>
                          2 記組
                        </span>
                        {' → 3 休息跳下一組'}
                      </span>
                      {!selectedEx && (
                        <Button
                          size="sm"
                          variant="soft"
                          className="ml-auto"
                          onClick={() => setPickerOpen(true)}
                        >
                          <Search className="h-3.5 w-3.5" />
                          開動作庫
                        </Button>
                      )}
                    </div>
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
                            value={Math.max(0, Math.max(restSec, restLeft || 0) - (restLeft || 0))}
                            max={Math.max(restSec, restLeft || 0, 1)}
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
                            <button
                              type="button"
                              onClick={() => setRestFullscreen(true)}
                              className="ml-auto shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-accent touch-manipulation"
                            >
                              放大
                            </button>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                            {restLeft === 0
                              ? '休息完，重量格準備好。改完撳「記低」就得。'
                              : !restRunning
                                ? restAutoStart
                                  ? '已暫停'
                                  : '記低咗。撳「開始倒數」先計時，長度會記住。'
                                : '倒數完跳下一組。±15 會記住下次休息。'}
                          </p>
                          <RestTimerControls
                            variant="inline"
                            restSec={restSec}
                            restLeft={restLeft ?? 0}
                            restRunning={restRunning}
                            autoStart={restAutoStart}
                            canVibrate={canVibrate}
                            onPick={pickRestDuration}
                            onAdjust={adjustRest}
                            onToggleRun={toggleRestRun}
                            onSkip={skipRest}
                            onToggleAuto={toggleRestAuto}
                          />
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Logger */}
                  <div
                    ref={loggerRef}
                    className={cn(landscapeLog && 'train-landscape-log grid gap-3 md:grid-cols-2')}
                  >
                  <Card>
                    {calmAfterRest && (
                      <TrainCalmLine
                        text={calmAfterRest}
                        acceptLabel={
                          betweenVisible && typeof betweenVisible.suggestedWeightKg === 'number'
                            ? `用 ${betweenVisible.suggestedWeightKg} kg`
                            : undefined
                        }
                        askBusy={askBusy}
                        askNote={betweenVisible ? askNote : null}
                        onAccept={
                          betweenVisible && typeof betweenVisible.suggestedWeightKg === 'number'
                            ? () => {
                                acceptTip(betweenVisible)
                                setRestReadyNext(false)
                              }
                            : undefined
                        }
                        onAsk={betweenVisible ? () => void askTip('between') : undefined}
                        onDismiss={() => {
                          if (betweenVisible) dismissTip(betweenVisible)
                          setRestReadyNext(false)
                        }}
                      />
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
                            {prefillHint && (
                              <span className="text-[11px] font-medium text-accent">{prefillHint}</span>
                            )}
                            {prs[selectedEx] && (
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span className="text-accent">
                                  PR {prs[selectedEx].weightKg}kg × {prs[selectedEx].reps}
                                </span>
                                <button
                                  type="button"
                                  aria-expanded={prChallengeOpen}
                                  onClick={() => setPrChallengeOpen((v) => !v)}
                                  className="text-[11px] font-medium text-muted touch-manipulation"
                                >
                                  {prChallengeOpen ? '收埋挑戰' : '挑戰'}
                                </button>
                                {prChallengeOpen && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pr = prs[selectedEx!]
                                      if (!pr) return
                                      const nextW = Math.round((pr.weightKg + 2.5) * 2) / 2
                                      markDraftEdited()
                                      setWeight(String(nextW))
                                      setReps(String(pr.reps))
                                      setPendingOutcome('ok')
                                      weightRef.current?.focus()
                                    }}
                                    className="text-[11px] font-semibold text-accent touch-manipulation"
                                  >
                                    +2.5 kg
                                  </button>
                                )}
                              </span>
                            )}
                            {lastLoggedForSelected && !usingLast && (
                              <button
                                type="button"
                                onClick={() => {
                                  setWeight(String(lastLoggedForSelected.weightKg))
                                  setReps(String(lastLoggedForSelected.reps))
                                  setPendingOutcome(lastLoggedForSelected.outcome || 'ok')
                                  draftTouched.current = false
                                  weightRef.current?.focus()
                                }}
                                className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-accent touch-manipulation"
                                title="填入上次重量／次數（唔會即記）"
                              >
                                上次 {lastLoggedForSelected.weightKg} kg × {lastLoggedForSelected.reps} · 填入
                              </button>
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
                              <div className="mb-1.5 px-0.5">
                                <span className="text-[10px] text-muted font-medium">快速換動作</span>
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

                        <div className="mb-3">
                          <button
                            type="button"
                            data-testid="exercise-tools"
                            aria-expanded={exerciseToolsOpen}
                            onClick={() => setExerciseToolsOpen((v) => !v)}
                            className="text-[12px] font-semibold text-muted hover:text-accent touch-manipulation"
                          >
                            {exerciseToolsOpen ? '收埋選項' : '冇機／砌片'}
                          </button>
                          {exerciseToolsOpen && (
                            <div className="mt-2 space-y-2">
                              {subTips.length > 0 && (
                                <div className="rounded-2xl border border-border bg-surface-muted px-3 py-2.5">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="text-[10px] font-semibold text-muted tracking-wide">
                                      冇呢部機？換呢啲
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                      {(['槓鈴', '啞鈴', '機械'] as const).map((eq) => (
                                        <button
                                          key={eq}
                                          type="button"
                                          onClick={() =>
                                            setAvoidEquip((v) => (v === eq ? null : eq))
                                          }
                                          className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] border touch-manipulation',
                                            avoidEquip === eq
                                              ? 'border-accent bg-accent-soft text-accent font-semibold'
                                              : 'border-border text-muted'
                                          )}
                                        >
                                          冇{eq}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {subTips.map(({ exercise: ex, reason }) => (
                                      <button
                                        key={ex.id}
                                        type="button"
                                        onClick={() => pickExercise(ex.id)}
                                        className="rounded-full border border-accent/25 bg-accent-soft/50 px-2.5 py-1.5 text-[11px] font-medium text-accent touch-manipulation"
                                        title={reason}
                                      >
                                        {ex.nameZh}
                                        <span className="text-muted font-normal"> · {ex.equipment}</span>
                                      </button>
                                    ))}
                                  </div>
                                  {avoidEquip && (
                                    <p className="mt-1.5 text-[10px] text-muted">按「冇{avoidEquip}」篩替代 · 撳動作即換</p>
                                  )}
                                </div>
                              )}
                              {exerciseById(selectedEx)?.equipment === '槓鈴' && weightN != null && weightN > 0 && (
                                <PlateHint
                                  weightKg={weightN}
                                  onPickTotal={(kg) => {
                                    markDraftEdited()
                                    setWeight(String(kg))
                                  }}
                                />
                              )}
                              {exerciseById(selectedEx)?.equipment === '槓鈴' && !(weightN != null && weightN > 0) && (
                                <p className="text-[12px] text-muted">打咗重量先計槓片點砌。</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] text-muted mb-1.5 block">重量 (kg)</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => bumpWeight(-2.5)}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-surface-muted text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                −
                              </button>
                              <Input
                                ref={weightRef}
                                type="number"
                                inputMode="decimal"
                                step={2.5}
                                min={0}
                                placeholder="—"
                                value={weight}
                                onChange={(e) => {
                                  markDraftEdited()
                                  setWeight(e.target.value)
                                }}
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
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-surface-muted text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                +
                              </button>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {(
                                exerciseById(selectedEx)?.equipment === '槓鈴'
                                  ? ([-5, -2.5, -1.25, 1.25, 2.5, 5] as const)
                                  : ([-5, -2.5, 2.5, 5] as const)
                              ).map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => bumpWeight(d)}
                                  className="flex-1 rounded-xl py-1.5 text-[11px] font-medium text-accent hover:bg-accent-soft transition tabular-nums touch-manipulation"
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
                                onClick={() => {
                                  markDraftEdited()
                                  setReps((r) => {
                                    const cur = draftReps(r)
                                    if (cur == null) return r
                                    return String(Math.max(1, cur - 1))
                                  })
                                }}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-surface-muted text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                −
                              </button>
                              <Input
                                ref={repsRef}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                placeholder="—"
                                value={reps}
                                onChange={(e) => {
                                  markDraftEdited()
                                  setReps(e.target.value)
                                }}
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
                                onClick={() => {
                                  markDraftEdited()
                                  setReps((r) => {
                                    const cur = draftReps(r)
                                    return String(cur == null ? 1 : cur + 1)
                                  })
                                }}
                                className="h-16 w-14 rounded-2xl border border-border/90 bg-surface-muted text-2xl font-medium hover:bg-accent-soft active:scale-95 transition touch-manipulation"
                              >
                                +
                              </button>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {[6, 8, 10, 12].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => {
                                    markDraftEdited()
                                    setReps(String(n))
                                  }}
                                  className={cn(
                                    'flex-1 rounded-xl py-2.5 text-xs font-semibold transition tabular-nums touch-manipulation min-h-[44px]',
                                    repsN === n
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

                        <div className="mb-2.5 grid grid-cols-4 gap-1.5">
                          {(
                            [
                              { id: 'ok' as const, label: '正常組' },
                              { id: 'warmup' as const, label: '熱身組' },
                              { id: 'half' as const, label: '半組' },
                              { id: 'fail' as const, label: '失敗組' },
                            ] as const
                          ).map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setPendingOutcome(o.id)}
                              className={cn(
                                'rounded-2xl border py-2.5 text-[11px] sm:text-[12px] font-semibold touch-manipulation min-h-[48px]',
                                pendingOutcome === o.id
                                  ? o.id === 'fail'
                                    ? 'border-danger/40 bg-danger/10 text-danger'
                                    : o.id === 'half'
                                      ? 'border-warning/40 bg-warning/10 text-warning'
                                      : o.id === 'warmup'
                                        ? 'border-border bg-surface-muted text-foreground'
                                        : 'border-accent bg-accent-soft text-accent'
                                  : 'border-border text-muted hover:text-foreground'
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 mb-2">
                          <motion.div className="flex-[1.7]" whileTap={reduce ? undefined : { scale: 0.98 }} transition={springSnappy}>
                            <Button
                              size="xl"
                              data-testid="log-set"
                              className="w-full text-lg gap-2 h-[4.5rem] rounded-[20px] shadow-hover touch-manipulation"
                              disabled={!logFigures}
                              onClick={() => addSet()}
                            >
                              <Plus className="h-7 w-7" />
                              記低
                              {logFigures ? ` · ${logFigures}` : ''}
                              {pendingOutcome === 'half' ? ' · 半' : pendingOutcome === 'fail' ? ' · 敗' : pendingOutcome === 'warmup' ? ' · 熱' : ''}
                            </Button>
                          </motion.div>
                          <Button
                            size="xl"
                            variant="secondary"
                            className="flex-1 h-[4.5rem] text-base px-3 rounded-[20px]"
                            disabled={!lastLoggedForSelected}
                            onClick={repeatLastSet}
                            title="一掣再記同上組重量同次數"
                          >
                            同上組
                            {lastLoggedForSelected
                              ? ` ${lastLoggedForSelected.weightKg}×${lastLoggedForSelected.reps}`
                              : ''}
                          </Button>
                        </div>
                        <div className="mb-2 flex items-center justify-between px-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = !sfxOn
                              setSfxOn(next)
                              saveTrainSfxEnabled(next)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted touch-manipulation"
                          >
                            {sfxOn ? <Volume2 className="h-3.5 w-3.5 text-accent" /> : <VolumeX className="h-3.5 w-3.5" />}
                            {sfxOn ? '音效開' : '音效關'}
                          </button>
                          <span className="text-[10px] text-muted">熱身／失敗／半組可之後喺列表改</span>
                        </div>
                        {nextPlanExercise && setsForSelected > 0 && (
                          <button
                            type="button"
                            data-testid="next-exercise"
                            onClick={() => pickExercise(nextPlanExercise)}
                            className="mt-1 w-full text-center text-[13px] font-medium text-accent py-2 touch-manipulation"
                          >
                            下一個 · {exerciseById(nextPlanExercise)?.nameZh || '下一動作'} →
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
                    <div className="mt-3 border-t border-border/70 pt-2">
                      {confirmFinish ? (
                        <div data-testid="finish-confirm" className="px-0.5">
                          <p className="text-[13px] leading-snug mb-2">
                            {active.sets.length <= 1
                              ? '得一組都完場？可以繼續加組。'
                              : `完場？而家 ${active.sets.length} 組。`}
                          </p>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => setConfirmFinish(false)}
                              className="min-h-11 text-[13px] font-semibold text-muted touch-manipulation"
                            >
                              繼續練
                            </button>
                            <button
                              type="button"
                              onClick={finishSession}
                              className="min-h-11 text-[13px] font-semibold text-accent touch-manipulation"
                            >
                              確認完場
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-0.5">
                          <button
                            type="button"
                            data-testid="abandon-session"
                            onClick={discardSession}
                            className="min-h-11 text-[13px] font-medium text-muted touch-manipulation"
                          >
                            放棄
                          </button>
                          <button
                            type="button"
                            data-testid="finish-session"
                            disabled={active.sets.length === 0}
                            onClick={() => {
                              setRestFullscreen(false)
                              setConfirmFinish(true)
                            }}
                            className="min-h-11 text-[13px] font-semibold text-muted disabled:opacity-40 touch-manipulation"
                          >
                            完場
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>

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
                                  'flex items-center justify-between rounded-xl bg-surface-muted border border-border px-3 py-2.5 text-sm gap-2',
                                  justAdded === s.id && 'pr-burst ring-2 ring-accent/25',
                                  s.outcome === 'fail' && 'border-danger/30 bg-danger/5',
                                  s.outcome === 'half' && 'border-warning/30 bg-warning/5',
                                  s.outcome === 'warmup' && 'border-border/70 bg-surface'
                                )}
                              >
                                <span className="text-muted tabular-nums w-8 shrink-0">
                                  {workingSetLabel(group.sets, s.id)}
                                </span>
                                <span className="font-medium tabular-nums flex-1">
                                  {s.weightKg} kg × {s.reps}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => cycleSetOutcome(s.id)}
                                  className={cn(
                                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold border touch-manipulation',
                                    s.outcome === 'fail'
                                      ? 'border-danger/40 text-danger'
                                      : s.outcome === 'half'
                                        ? 'border-warning/40 text-warning'
                                        : s.outcome === 'warmup'
                                          ? 'border-border text-muted'
                                          : 'border-accent/30 text-accent'
                                  )}
                                  title="撳一下切換：正常／半組／失敗／熱身"
                                >
                                  {s.outcome === 'fail'
                                    ? '失敗'
                                    : s.outcome === 'half'
                                      ? '半組'
                                      : s.outcome === 'warmup'
                                        ? '熱身'
                                        : '正常'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Card>
                  )}

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
              className="space-y-6"
            >
              <p className="text-[11px] text-muted leading-relaxed px-0.5">
                <span className="font-semibold text-foreground">開波</span>
                ＝今日場 · 
                <span className="font-semibold text-foreground">課表</span>
                ＝一週安排。示範腿日喺下面最醒目。
              </p>

              {/* —— 1. 跟住緊 —— */}
              <section className="space-y-3" aria-labelledby="plan-col-following">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                    1
                  </span>
                  <h2 id="plan-col-following" className="text-sm font-semibold">
                    跟住緊
                  </h2>
                  <Badge tone="accent">進度</Badge>
                </div>
                <ActivePlanPanel
                  refreshKey={planRefreshKey}
                  onStartDay={(title, ids) => {
                    if (active && !window.confirm('而家練緊，改用呢個課表？')) return
                    startSession(`plan:${title}`, ids)
                  }}
                />
                <Card className="py-4 border-accent/25 bg-accent-soft/25">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[11px] font-semibold text-accent tracking-wide mb-0.5">
                        簡易週循環
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
                    撳日子一掣開波。可換新手三堂／腿日加強／忙碌兩日。
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
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
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
                  <div className="mb-3 space-y-1">
                    <p className="text-[10px] text-muted px-0.5">調日：上／下移對調訓練內容（日子名唔變）</p>
                    {weekSlots.map((s) => (
                      <div
                        key={`reorder-${s.dayIndex}`}
                        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5"
                      >
                        <span className="w-6 text-[11px] font-semibold text-muted">星期{s.nameZh}</span>
                        <span className="flex-1 text-[12px] font-medium truncate">{s.label}</span>
                        <button
                          type="button"
                          disabled={s.dayIndex === 0}
                          aria-label="上移"
                          onClick={() => {
                            const next = moveWeeklySlot(weekSlots, s.dayIndex, -1)
                            saveWeeklySchedule(next)
                            setWeekSlots(next)
                            setWeekProgress(computeWeeklySlotProgress(sessions))
                            setTodayHint(getTodayPlanHint(sessions))
                          }}
                          className="rounded-lg border border-border p-1.5 text-muted disabled:opacity-30 touch-manipulation"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={s.dayIndex === 6}
                          aria-label="下移"
                          onClick={() => {
                            const next = moveWeeklySlot(weekSlots, s.dayIndex, 1)
                            saveWeeklySchedule(next)
                            setWeekSlots(next)
                            setWeekProgress(computeWeeklySlotProgress(sessions))
                            setTodayHint(getTodayPlanHint(sessions))
                          }}
                          className="rounded-lg border border-border p-1.5 text-muted disabled:opacity-30 touch-manipulation"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
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
                      開波 · {todayHint.template.name}
                    </Button>
                  )}
                </Card>
              </section>

              {/* —— 2. 週模板 —— */}
              <section className="space-y-3" aria-labelledby="plan-col-presets">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                    2
                  </span>
                  <h2 id="plan-col-presets" className="text-sm font-semibold">
                    週模板
                  </h2>
                  <Badge tone="muted">跟住一套</Badge>
                </div>
                <p className="text-xs text-muted px-0.5 leading-relaxed">
                  撳一下就跟住完整週課表（組數＋進度）。單日模板可即刻開波，鍾意就存入「我嘅自訂」。
                </p>
                <WeeklyPresets
                  userId={user?.id ?? null}
                  onApplied={() => setPlanRefreshKey((n) => n + 1)}
                />
                <Stagger className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-medium text-muted px-0.5">
                      單日模板 · 推拉腿／腿日／全身
                    </p>
                  </div>
                  {[...TEMPLATES].sort((a, b) => (a.id === 'newbie-leg-day' ? -1 : b.id === 'newbie-leg-day' ? 1 : 0)).map((t) => (
                    <StaggerItem key={t.id}>
                      <Card
                        hover
                        className={cn(
                          'h-full flex flex-col',
                          t.id === 'newbie-leg-day'
                            ? 'border-accent/50 bg-gradient-to-br from-accent-soft via-surface to-surface ring-2 ring-accent/25'
                            : t.newbie && 'border-accent/30 bg-accent-soft/20'
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
                            開波
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              saveTemplateAsCustom(t)
                              setCustomPlans(loadCustomDayPlans())
                              setSavedToast(`已存「${t.name}」入我嘅自訂`)
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
              </section>

              {/* —— 3. 我嘅自訂 —— */}
              <section className="space-y-3" aria-labelledby="plan-col-custom">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                    3
                  </span>
                  <h2 id="plan-col-custom" className="text-sm font-semibold">
                    我嘅自訂
                  </h2>
                  <Badge tone="muted">儲存</Badge>
                </div>
                <CustomPlanBuilder
                  userId={user?.id ?? null}
                  onSaved={() => setPlanRefreshKey((n) => n + 1)}
                />
                {customPlans.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <p className="text-xs font-medium text-muted">已存低嘅單日課表</p>
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
                                開波
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  if (!window.confirm(`刪除「${cp.name}」？唔可以復原。`)) return
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
                ) : (
                  <EmptyState
                    compact
                    emoji="📋"
                    title="未有自訂課表"
                    description="跟示範腿日，或者上面週模板撳「存入我嘅自訂」／自己砌一套。"
                    actionLabel="睇週模板"
                    onAction={() => {
                      document.getElementById('plan-col-presets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  />
                )}
              </section>

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
              <LiftProgressCard sessions={sessions} />

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
                  同課表打通：跟住一套課表之後一掣開波，完場會計入呢度。
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
                  {streakComebackLine(streak, trainedToday()) ||
                    '破咗個人最佳會即刻彈出嚟。全部紀錄同日期留喺呢度。'}
                </p>
                {Object.keys(prs).length === 0 ? (
                  <EmptyState
                    compact
                    emoji="🏆"
                    title="未有個人最佳"
                    description="第一組記低就會開始追。之後破紀錄會彈出嚟，同留喺呢度。"
                    actionLabel="去今日開波"
                    onAction={() => setTab('today')}
                    secondaryLabel="跟示範腿日"
                    onSecondary={() => setTab('templates')}
                  />
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {Object.entries(prs)
                      .sort((a, b) => b[1].weightKg - a[1].weightKg)
                      .map(([id, pr]) => (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {exerciseById(id)?.nameZh || id}
                            </span>
                            <span className="text-[10px] text-muted">
                              {new Date(pr.at).toLocaleDateString('zh-HK', {
                                month: 'numeric',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                          <span className="text-sm tabular-nums text-accent font-semibold shrink-0">
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
                          {s.sets.length > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3 w-full touch-manipulation"
                              onClick={() => startFromSession(s)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              再做呢場
                            </Button>
                          )}
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
                                  tip: tipsOn ? s.analysis.tips?.[0] : undefined,
                                  prs: (s.analysis.prs || []).map(
                                    (p) => `${p.name} ${p.weightKg}×${p.reps}`
                                  ),
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

        {/* 登入放主 CTA 之後，唔搶第一屏 */}
        {!user && (
          <div className="mt-5 mb-2">
            <LoginPromptBanner />
          </div>
        )}
        <div className="mt-4 mb-2">
          <SyncStatusLine loggedIn={Boolean(user)} note={cloudNote} />
        </div>
      </PageTransition>


      {/* Fullscreen rest countdown */}
      <AnimatePresence>
        {restLeft != null && restFullscreen && (
          <motion.div
            key="rest-fs"
            className="fixed inset-0 z-[70] flex flex-col bg-[#0c0f0e]/92 text-white backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="組間休息倒數"
          >
            <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
              <div className="text-sm font-medium text-white/80">
                {restLeft === 0 ? '休息完 · 下一組' : '組間休息'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !sfxOn
                    setSfxOn(next)
                    saveTrainSfxEnabled(next)
                  }}
                  className="rounded-full border border-white/20 bg-white/10 p-2.5 touch-manipulation"
                  aria-label={sfxOn ? '關閉音效' : '開啟音效'}
                >
                  {sfxOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setRestFullscreen(false)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium touch-manipulation"
                >
                  縮小
                </button>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
              <div
                className={cn(
                  'font-serif tabular-nums tracking-tight leading-none',
                  restLeft === 0 ? 'text-6xl text-teal-300' : 'text-[7.5rem] sm:text-[9rem]'
                )}
              >
                {restLeft === 0 ? '✓' : formatRest(restLeft)}
              </div>
              <p className="mt-4 text-center text-sm text-white/70 max-w-xs leading-relaxed">
                {restLeft === 0
                  ? '休息完。縮細之後撳「記低」。'
                  : !restRunning
                    ? '未開始計時。撳「開始倒數」，或者跳過直接記下一組。'
                    : selectedEx
                      ? `${exerciseById(selectedEx)?.nameZh || ''} · 完咗會震，再跳返記組`
                      : '完咗會震，再跳返記組'}
              </p>
              <RestTimerControls
                variant="fullscreen"
                restSec={restSec}
                restLeft={restLeft ?? 0}
                restRunning={restRunning}
                autoStart={restAutoStart}
                canVibrate={canVibrate}
                onPick={pickRestDuration}
                onAdjust={adjustRest}
                onToggleRun={toggleRestRun}
                onSkip={skipRest}
                onToggleAuto={toggleRestAuto}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise picker */}
      {active && selectedEx && tab === 'today' && (
        <div className="one-hand-sticky fixed above-nav-gap left-0 right-0 z-40 px-4 pointer-events-none sm:hidden md:hidden">
          <div className="mx-auto max-w-lg pointer-events-auto flex gap-2">
            {lastLoggedForSelected && (
              <Button
                size="xl"
                variant="secondary"
                className="h-16 min-w-[5.75rem] rounded-[20px] px-3 text-base touch-manipulation"
                onClick={repeatLastSet}
              >
                同上
              </Button>
            )}
            <Button
              size="xl"
              className="flex-1 h-16 rounded-[20px] shadow-hover text-lg touch-manipulation"
              disabled={!logFigures}
              onClick={() => addSet()}
            >
              <Plus className="h-6 w-6" />
              {logFigures ? `記低 · ${logFigures}` : '記低'}
              {pendingOutcome === 'half'
                ? ' · 半'
                : pendingOutcome === 'fail'
                  ? ' · 敗'
                  : pendingOutcome === 'warmup'
                    ? ' · 熱'
                    : ''}
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
                      setSearch('')
                      setMuscleFilter(null)
                      setEquipmentFilter(null)
                    }}
                    aria-label="關閉"
                  >
                    <X className="h-5 w-5 text-muted" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-muted mb-1 px-0.5">部位</p>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
                      <button
                        type="button"
                        onClick={() => setMuscleFilter(null)}
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                          !muscleFilter
                            ? 'border-accent bg-accent text-white'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        全部
                      </button>
                      {MUSCLE_FILTERS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMuscleFilter((cur) => (cur === m ? null : m))}
                          className={cn(
                            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                            muscleFilter === m
                              ? 'border-accent bg-accent text-white'
                              : 'border-border text-muted hover:text-foreground'
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted mb-1 px-0.5">儀器</p>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
                      <button
                        type="button"
                        onClick={() => setEquipmentFilter(null)}
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                          !equipmentFilter
                            ? 'border-accent bg-accent text-white'
                            : 'border-border text-muted hover:text-foreground'
                        )}
                      >
                        全部
                      </button>
                      {EQUIPMENT_FILTERS.filter((e) => e !== '其他').map((eq) => (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => setEquipmentFilter((cur) => (cur === eq ? null : eq))}
                          className={cn(
                            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                            equipmentFilter === eq
                              ? 'border-accent bg-accent text-white'
                              : 'border-border text-muted hover:text-foreground'
                          )}
                        >
                          {eq}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted mb-1 px-0.5">俗稱</p>
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
                  </div>
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  部位＋儀器＋俗稱一齊篩。撳動作＝加入今日；「點做」睇步驟／GIF。未開波會自動幫你開場。
                </p>
              </div>
              <ul className="overflow-y-auto p-2 flex-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-8 text-center text-sm text-muted">
                    搵唔到——試換部位／儀器，或者搜 RDL、保加利亞、後腿
                  </li>
                ) : (
                  <>
                    {howtoFavs.length > 0 && (
                      <li className="list-none mb-3 px-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Star className="h-3 w-3 text-accent fill-accent" />
                          <span className="text-[10px] font-semibold text-accent">我常睇</span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                          {howtoFavs.map((id) => {
                            const ex = exerciseById(id)
                            if (!ex) return null
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  pickExercise(id)
                                  setPickerOpen(false)
                                }}
                                className="shrink-0 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-[11px] font-medium text-accent touch-manipulation"
                              >
                                {ex.nameZh}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    )}
                  {filtered.map((ex) => {
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
                                  {ex.nameEn} · {ex.muscle} · {ex.equipment}
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
                  })}
                  </>
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
              if (active && !active.endedAt) return
              setTab('history')
              window.setTimeout(() => {
                document.getElementById('pr-wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 120)
            }}
          >
            <Trophy className="h-4 w-4 text-amber-300 shrink-0" />
            <div>
              <div className="text-xs opacity-70">
                {active && !active.endedAt ? '新 PR' : '新 PR · 撳睇牆'}
              </div>
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
              data-testid="finish-sheet"
              className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-surface border border-border p-6 shadow-hover"
              initial={reduce ? false : { scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={springSoft}
            >
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-accent">
                  {lastAnalysis.countsAsDay === false ? '記低咗' : '搞掂'}
                </p>
                <h2 className="font-serif text-2xl tracking-tight mt-0.5">
                  {lastAnalysis.countsAsDay === false
                    ? '未算完一場'
                    : lastFinished
                      ? TEMPLATES.find((t) => t.id === lastFinished.templateId)?.name || '今日訓練'
                      : '今日訓練'}
                </h2>
                <p className="text-[12px] text-muted mt-0.5">
                  {lastFinished
                    ? new Date(lastFinished.endedAt || lastFinished.startedAt).toLocaleString('zh-HK', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-2xl border border-border bg-surface-muted px-2 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {Math.round(lastAnalysis.volume).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted">容量</div>
                </div>
                <div className="rounded-2xl border border-border bg-surface-muted px-2 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">{lastAnalysis.sets}</div>
                  <div className="text-[10px] text-muted">組數</div>
                </div>
                <div className="rounded-2xl border border-border bg-surface-muted px-2 py-3 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {(lastAnalysis.prs?.length ?? 0) > 0
                      ? lastAnalysis.prs!.length
                      : `${Math.floor(lastAnalysis.durationSec / 60)}:${String(lastAnalysis.durationSec % 60).padStart(2, '0')}`}
                  </div>
                  <div className="text-[10px] text-muted">
                    {(lastAnalysis.prs?.length ?? 0) > 0 ? 'PR' : '時長'}
                  </div>
                </div>
              </div>

              {(lastAnalysis.prs?.length ?? 0) > 0 && (
                <ul className="mb-4 space-y-1">
                  {lastAnalysis.prs!.map((pr) => (
                    <li key={pr.exerciseId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Trophy className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <span className="truncate">{pr.name}</span>
                      </span>
                      <span className="tabular-nums font-semibold text-accent shrink-0">
                        {pr.weightKg}×{pr.reps}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {finishLines.length > 0 && (
                <p
                  data-testid="finish-tip"
                  className="mb-4 text-sm leading-snug text-foreground"
                >
                  {finishLines[0]}
                </p>
              )}

              {!user && lastAnalysis.countsAsDay !== false && (
                <div className="mb-3 rounded-[20px] border border-accent/30 bg-gradient-to-br from-accent-soft/90 via-surface to-surface px-4 py-3.5 shadow-soft ring-1 ring-accent/15">
                  <p className="font-serif text-base leading-tight">登入鎖住呢場進度</p>
                  <p className="mt-1 text-[12px] text-muted leading-snug">
                    而家淨係呢部機。登入之後換手機都睇到。
                  </p>
                  <Link
                    href="/login?from=finish"
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white touch-manipulation hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  >
                    去登入
                  </Link>
                </div>
              )}

              {lastAnalysis.countsAsDay !== false && (
                <div className="mb-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={tomorrowPingBusy || tomorrowPingSet}
                    onClick={() => void scheduleTomorrowTrainPing()}
                  >
                    {tomorrowPingSet ? '已設聽日提醒' : tomorrowPingBusy ? '設定緊…' : '聽日提我開台'}
                  </Button>
                  {tomorrowPingMsg ? (
                    <p className="mt-1.5 text-center text-[11px] text-muted" role="status">
                      {tomorrowPingMsg}
                    </p>
                  ) : null}
                </div>
              )}

              {lastAnalysis.countsAsDay !== false && (
                <Link
                  href="/eat?focus=protein"
                  onClick={() => setFinishOpen(false)}
                  className="mb-3 flex flex-col rounded-[20px] border border-border bg-surface px-4 py-3.5 shadow-soft touch-manipulation transition hover:bg-surface-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                >
                  <span className="font-serif text-base leading-tight">練完加蛋白</span>
                  <span className="mt-1 text-[12px] text-muted leading-snug">
                    港式快加／影餐——叉燒飯、譚仔一掣
                  </span>
                </Link>
              )}

              {lastFinished && lastAnalysis && lastAnalysis.countsAsDay !== false && (
                <ShareCardButton
                  kind="workout"
                  primary
                  label="分享去 Threads"
                  variant="default"
                  size="lg"
                  payload={{
                    title:
                      TEMPLATES.find((t) => t.id === lastFinished.templateId)?.name || '今日訓練',
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
                    tip: finishLines[0],
                    prs: (lastAnalysis.prs || []).map((p) => `${p.name} ${p.weightKg}×${p.reps}`),
                  }}
                />
              )}
              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => {
                  setFinishOpen(false)
                  setLastFinished(null)
                }}
              >
                收工
              </Button>
              <p className="mt-3 text-[10px] text-muted leading-relaxed">
                一般參考。唔舒服就停。{' '}
                <a href="/disclaimer" className="text-accent font-medium hover:underline">
                  免責
                </a>
              </p>
              {lastAnalysis.countsAsDay !== false && (
              <div className="mt-3">
                <InstallPrompt variant="banner" forceAfterWorkout />
              </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          <TrainFirstGuide open={showFirstGuide} onClose={() => setShowFirstGuide(false)} />
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
