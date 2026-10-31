'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  ImagePlus,
  Pencil,
  Trash2,
  Utensils,
  X,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressBar, ProgressRing, MacroBars } from '@/components/ui/progress'
import { LoginPromptBanner } from '@/components/auth/login-card'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import {
  HK_DISH_ESTIMATES,
  mockEstimateFromFile,
  scaleMacros,
} from '@/lib/fitness/meals-demo'
import { compressMealImage } from '@/lib/fitness/compress-image'
import { getOrCreateEatGuestId } from '@/lib/fitness/eat-guest-id'
import {
  type MealEntry,
  type MealMacros,
  isSameDay,
  loadGoals,
  loadMeals,
  loadPRs,
  loadSessions,
  newId,
  saveMeals,
  todayKey,
} from '@/lib/fitness/storage'
import {
  type PeriodKind,
  type MealPeriodBucket,
  addDays,
  deleteMealCloud,
  fetchMealPeriodTotals,
  rangeForPeriod,
  startOfDay,
  upsertMeal,
} from '@/lib/fitness/cloud'
import { migrateLocalFitnessToCloud } from '@/lib/fitness/migrate'
import { ShareCardButton } from '@/components/fitness/share-card-button'
import {
  evaluateFitnessAchievements,
  unlockFitnessAchievements,
  loadFitnessUnlocked,
  fitnessAchievementById,
} from '@/lib/fitness/achievements'
import { cn } from '@/lib/utils'

type Draft = {
  previewUrl: string
  file: File | null
  fileName: string
  status: 'estimating' | 'ready'
  name: string
  baseMacros: MealMacros
  portion: number
  estimated: boolean
  source: 'ai' | 'mock' | 'manual'
  note?: string
}

function sumMacros(meals: MealEntry[]): MealMacros {
  return meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.macros.kcal,
      protein: a.protein + m.macros.protein,
      carbs: a.carbs + m.macros.carbs,
      fat: a.fat + m.macros.fat,
      fiber: (a.fiber || 0) + (m.macros.fiber || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

function mealTimeLabel(iso: string) {
  const h = new Date(iso).getHours()
  if (h < 11) return '早餐'
  if (h < 15) return '午餐'
  if (h < 18) return '下午茶'
  if (h < 22) return '晚餐'
  return '宵夜'
}

function periodLabel(k: PeriodKind) {
  return k === 'day' ? '日' : k === 'week' ? '週' : '月'
}

export function EatClient() {
  const reduce = useReducedMotion()
  const { ready: authReady, user } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [goals, setGoals] = useState({ proteinG: 150, kcal: 2200 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKind>('day')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [buckets, setBuckets] = useState<MealPeriodBucket[]>([])
  const [syncing, setSyncing] = useState(false)
  const [cloudNote, setCloudNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const range = useMemo(() => rangeForPeriod(period, anchor), [period, anchor])

  const loadLocal = useCallback(() => {
    setMeals(loadMeals())
    setGoals(loadGoals())
  }, [])

  // Initial local load
  useEffect(() => {
    loadLocal()
    setReady(true)
  }, [loadLocal])

  // Cloud hydrate + idempotent local → cloud migrate when logged in
  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      setSyncing(true)
      try {
        const supabase = createClient()
        const result = await migrateLocalFitnessToCloud(supabase, user.id)
        if (cancelled) return
        setMeals(result.meals)
        setCloudNote(result.note)
      } catch (e) {
        if (!cancelled) setCloudNote(e instanceof Error ? e.message : 'sync 唔到')
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  // Period RPC totals when logged in; else derive from local meals
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      if (user) {
        try {
          const supabase = createClient()
          const rows = await fetchMealPeriodTotals(
            supabase,
            range.from.toISOString(),
            range.to.toISOString(),
            period
          )
          if (!cancelled) setBuckets(rows)
          return
        } catch {
          /* fall through to local */
        }
      }
      // Local aggregate by calendar day inside range
      const byDay = new Map<string, MealPeriodBucket>()
      for (const m of meals) {
        const t = new Date(m.createdAt).getTime()
        if (t < range.from.getTime() || t >= range.to.getTime()) continue
        const day = todayKey(new Date(m.createdAt))
        const cur = byDay.get(day) || {
          bucket_start: day,
          meals_count: 0,
          kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
        }
        cur.meals_count += 1
        cur.kcal += m.macros.kcal
        cur.protein_g += m.macros.protein
        cur.carbs_g += m.macros.carbs
        cur.fat_g += m.macros.fat
        cur.fiber_g += m.macros.fiber || 0
        byDay.set(day, cur)
      }
      // For week/month views without RPC, collapse
      if (period === 'day') {
        if (!cancelled) setBuckets([...byDay.values()].sort((a, b) => b.bucket_start.localeCompare(a.bucket_start)))
      } else {
        const total = [...byDay.values()].reduce(
          (a, b) => ({
            bucket_start: range.from.toISOString().slice(0, 10),
            meals_count: a.meals_count + b.meals_count,
            kcal: a.kcal + b.kcal,
            protein_g: a.protein_g + b.protein_g,
            carbs_g: a.carbs_g + b.carbs_g,
            fat_g: a.fat_g + b.fat_g,
            fiber_g: a.fiber_g + b.fiber_g,
          }),
          {
            bucket_start: range.from.toISOString().slice(0, 10),
            meals_count: 0,
            kcal: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
          }
        )
        if (!cancelled) setBuckets(total.meals_count ? [total] : [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, user, meals, range, period])

  const periodMeals = useMemo(() => {
    return meals
      .filter((m) => {
        const t = new Date(m.createdAt).getTime()
        return t >= range.from.getTime() && t < range.to.getTime()
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [meals, range])

  const periodSum = useMemo(() => {
    if (buckets.length > 0) {
      return buckets.reduce(
        (a, b) => ({
          kcal: a.kcal + b.kcal,
          protein: a.protein + b.protein_g,
          carbs: a.carbs + b.carbs_g,
          fat: a.fat + b.fat_g,
          fiber: a.fiber + b.fiber_g,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      )
    }
    return sumMacros(periodMeals)
  }, [buckets, periodMeals])

  const todayMeals = useMemo(() => {
    const day = todayKey(new Date())
    return meals
      .filter((m) => isSameDay(m.createdAt, day))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [meals])

  const todaySum = useMemo(() => sumMacros(todayMeals), [todayMeals])

  // Calendar heat for current month (protein per day)
  const monthHeat = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    const map = new Map<string, number>()
    for (const m of meals) {
      const t = new Date(m.createdAt)
      if (t >= start && t < end) {
        const k = todayKey(t)
        map.set(k, (map.get(k) || 0) + m.macros.protein)
      }
    }
    return map
  }, [meals, anchor])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4200)
  }

  const openFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setDraft({
      previewUrl: url,
      file,
      fileName: file.name,
      status: 'estimating',
      name: '認緊碟餸…',
      baseMacros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      portion: 1,
      estimated: true,
      source: 'ai',
    })

    void (async () => {
      try {
        const compressed = await compressMealImage(file)
        // Prefer compressed preview for modal + upload
        URL.revokeObjectURL(url)
        const compressedFile = new File([compressed.blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
          type: compressed.mediaType,
        })
        setDraft((prev) =>
          prev
            ? { ...prev, previewUrl: compressed.dataUrl, file: compressedFile }
            : null
        )

        const guestId = getOrCreateEatGuestId()
        const res = await fetch('/api/eat/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ttl-guest-id': guestId,
          },
          body: JSON.stringify({
            imageDataUrl: compressed.dataUrl,
            mediaType: compressed.mediaType,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          source?: 'ai'
          name?: string
          macros?: MealMacros
          note?: string
          error?: string
          code?: string
          quota?: { remaining?: number; limit?: number }
          limit?: number
          remaining?: number
        }

        if (data.quota?.remaining != null) setQuotaRemaining(data.quota.remaining)
        if (typeof data.remaining === 'number') setQuotaRemaining(data.remaining)

        if (res.status === 429 && data.code === 'free_limit') {
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'ready',
                  name: '自己改碟餸',
                  baseMacros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
                  estimated: false,
                  source: 'manual',
                  note:
                    data.error ||
                    '今日免費 AI 額用晒，登入／聽日再試，或者而家自己改數字',
                }
              : null
          )
          setQuotaRemaining(0)
          showToast(
            data.error ||
              '今日免費 AI 額用晒，登入／聽日再試，或者而家自己改數字'
          )
          return
        }

        if (!res.ok || !data.macros || !data.name) {
          const err = new Error(data.error || 'AI 估唔到') as Error & { code?: string }
          err.code = data.code
          throw err
        }

        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: 'ready',
                name: data.name!,
                baseMacros: data.macros!,
                estimated: true,
                source: 'ai',
                note: data.note
                  ? `${data.note} · 數字可以改`
                  : 'AI 估嘅 · 撳格可以直接改數字',
              }
            : null
        )
      } catch (e) {
        const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code || '') : ''
        const billingish = code === 'gateway_billing' || code === 'gateway_quota' || code === 'ai_failed'
        const est = mockEstimateFromFile(file.name || 'meal.jpg')
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: 'ready',
                name: est.name,
                baseMacros: est.macros,
                estimated: true,
                source: billingish ? 'manual' : 'mock',
                note: billingish
                  ? 'AI 暫時唔得——下面數字可以自己改，改完再入日記'
                  : '示範估算 · 撳格可以直接改數字',
              }
            : null
        )
        const msg =
          e instanceof Error && e.message
            ? e.message
            : 'AI 估唔到'
        showToast(billingish ? `${msg}` : `${msg} · 可以自己改數字`)
      }
    })()
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) openFile(file)
  }

  const liveMacros = draft ? scaleMacros(draft.baseMacros, draft.portion) : null

  const persistList = async (next: MealEntry[], changed?: MealEntry, file?: File | null, remove?: MealEntry) => {
    setMeals(next)
    saveMeals(next)
    if (!user) return
    try {
      const supabase = createClient()
      if (remove) await deleteMealCloud(supabase, remove)
      if (changed) {
        const saved = await upsertMeal(supabase, user.id, changed, file)
        setMeals((cur) => {
          const mapped = cur.map((m) => (m.id === saved.id ? saved : m))
          saveMeals(mapped)
          return mapped
        })
      }
    } catch (e) {
      setCloudNote(e instanceof Error ? e.message : '存雲端唔到')
    }
  }

  const confirmDraft = () => {
    if (!draft || draft.status !== 'ready' || !liveMacros) return
    const entry: MealEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: draft.name,
      imageDataUrl: draft.previewUrl,
      macros: liveMacros,
      portion: draft.portion,
      estimated: draft.estimated,
      source: draft.source === 'ai' ? 'ai' : draft.source === 'mock' ? 'mock' : 'manual',
      note: draft.note,
    }
    const next = [entry, ...meals]
    void persistList(next, entry, draft.file)
    setDraft(null)
    try {
      const newly = evaluateFitnessAchievements({
        sessions: loadSessions(),
        meals: next,
        prs: loadPRs(),
        proteinGoal: goals.proteinG,
        already: loadFitnessUnlocked(),
      })
      if (newly.length) {
        unlockFitnessAchievements(newly)
        const a = fitnessAchievementById(newly[0])
        if (a) showToast(`${a.emoji} 解鎖：${a.title}`)
      }
    } catch {
      /* ignore */
    }
  }

  const removeMeal = (id: string) => {
    const victim = meals.find((m) => m.id === id)
    const next = meals.filter((m) => m.id !== id)
    void persistList(next, undefined, null, victim)
  }

  const updateMealMacros = (id: string, patch: Partial<MealEntry>) => {
    const next = meals.map((m) => (m.id === id ? { ...m, ...patch, source: 'manual' as const } : m))
    const changed = next.find((m) => m.id === id)
    void persistList(next, changed)
  }

  const addDemoDish = (idx: number) => {
    const dish = HK_DISH_ESTIMATES[idx]
    const entry: MealEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: dish.name,
      macros: { ...dish.macros },
      portion: 1,
      estimated: true,
      note: dish.hint,
      source: 'mock',
    }
    const next = [entry, ...meals]
    void persistList(next, entry)
    showToast(`已快加「${dish.name}」`)
    try {
      const newly = evaluateFitnessAchievements({
        sessions: loadSessions(),
        meals: next,
        prs: loadPRs(),
        proteinGoal: goals.proteinG,
        already: loadFitnessUnlocked(),
      })
      if (newly.length) {
        unlockFitnessAchievements(newly)
        const a = fitnessAchievementById(newly[0])
        if (a) showToast(`${a.emoji} 解鎖：${a.title}`)
      }
    } catch {
      /* ignore */
    }
  }

  const shiftAnchor = (dir: -1 | 1) => {
    if (period === 'day') setAnchor((a) => addDays(a, dir))
    else if (period === 'week') setAnchor((a) => addDays(a, dir * 7))
    else {
      setAnchor((a) => {
        const x = new Date(a)
        x.setMonth(x.getMonth() + dir)
        return startOfDay(x)
      })
    }
  }

  const jumpToDay = (isoDay: string) => {
    setPeriod('day')
    setAnchor(startOfDay(new Date(isoDay + 'T12:00:00')))
  }

  if (!ready || !authReady) {
    return (
      <AppShell>
        <PageSkeleton wide />
      </AppShell>
    )
  }

  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const monthStartWeekday = new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay()
  const heatMax = Math.max(1, ...monthHeat.values())

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <PageHeader
          className="mb-6"
          eyebrow="飲食"
          title="影低呢餐"
          description="卡路里、蛋白、碳水、脂肪一齊估。登入之後歷史會留低，隨時翻睇日／週／月總計。"
        />

        {!user && (
          <div className="mb-5">
            <LoginPromptBanner />
          </div>
        )}

        {user && (
          <div className="mb-4 flex items-center gap-2 text-[11px] text-muted">
            <Cloud className={cn('h-3.5 w-3.5 text-accent', syncing && 'animate-pulse')} />
            {syncing ? 'sync 緊…' : cloudNote || '飲食已上雲'}
          </div>
        )}

        {/* Period switcher */}
        <div className="mb-3 flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 flex gap-1 p-1 rounded-2xl bg-[#f0efee] border border-border">
            {(['day', 'week', 'month'] as PeriodKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setPeriod(k)
                  if (k === 'day' && todayKey(anchor) !== todayKey()) {
                    /* keep anchor — user can jump 今日 */
                  }
                }}
                aria-pressed={period === k}
                className={cn(
                  'relative flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors touch-manipulation',
                  period === k ? 'text-accent' : 'text-muted hover:text-foreground'
                )}
              >
                {period === k && (
                  <motion.span
                    layoutId="eat-period"
                    className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                    transition={springSoft}
                  />
                )}
                <span className="relative z-10">{periodLabel(k)}計</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPeriod('day')
              setAnchor(startOfDay(new Date()))
            }}
            className={cn(
              'shrink-0 rounded-xl border px-3 py-2.5 text-xs font-medium transition touch-manipulation',
              period === 'day' && todayKey(anchor) === todayKey()
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-border text-muted hover:text-foreground hover:bg-black/[0.03]'
            )}
          >
            今日
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${period}-${range.label}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={springSoft}
          >
            <Card className="mb-5 py-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3 gap-2">
                <button
                  type="button"
                  aria-label="上一段"
                  onClick={() => shiftAnchor(-1)}
                  className="h-9 w-9 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-black/[0.03] active:scale-95 transition touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center min-w-0 px-1">
                  <div className="text-sm font-medium truncate">{range.label}</div>
                  <div className="text-[11px] text-muted tabular-nums">{periodMeals.length} 餐</div>
                </div>
                <button
                  type="button"
                  aria-label="下一段"
                  onClick={() => shiftAnchor(1)}
                  className="h-9 w-9 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-black/[0.03] active:scale-95 transition touch-manipulation"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                {(
                  [
                    { label: 'kcal', v: Math.round(periodSum.kcal), tone: 'text-foreground' },
                    { label: '蛋白', v: `${Math.round(periodSum.protein)}g`, tone: 'text-accent' },
                    { label: '碳水', v: `${Math.round(periodSum.carbs)}g`, tone: 'text-warning' },
                    { label: '脂肪', v: `${Math.round(periodSum.fat)}g`, tone: 'text-[#7C3AED]' },
                  ] as const
                ).map((x) => (
                  <div
                    key={x.label}
                    className="rounded-2xl bg-[#fafaf9] border border-border px-1.5 sm:px-2 py-3 min-w-0"
                  >
                    <div className={cn('text-sm sm:text-base font-semibold tabular-nums truncate', x.tone)}>
                      {x.v}
                    </div>
                    <div className="text-[10px] text-muted">{x.label}</div>
                  </div>
                ))}
              </div>
              {period !== 'day' && periodMeals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/70">
                  <div className="flex justify-between text-[10px] text-muted mb-1.5">
                    <span>呢段蛋白進度（對目標 × 日數粗估）</span>
                    <span className="tabular-nums">
                      {Math.round(periodSum.protein)}g
                    </span>
                  </div>
                  <ProgressBar
                    value={periodSum.protein}
                    max={Math.max(
                      1,
                      goals.proteinG *
                        (period === 'week' ? 7 : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate())
                    )}
                    tone="protein"
                    height="md"
                  />
                </div>
              )}
              {period === 'month' && buckets.length > 1 && (
                <p className="mt-3 text-[11px] text-muted text-center">
                  本月有記錄嘅日子：{buckets.length} 日
                </p>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Today macros — rings + full bars */}
        <Card className="mb-4 py-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">今日進度</div>
              <div className="text-[11px] text-muted">對住你嘅蛋白／卡路里目標</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <ProgressRing
                value={todaySum.protein}
                max={goals.proteinG}
                label={`${Math.round(todaySum.protein)}`}
                sublabel="g P"
                size={56}
                stroke={6}
                tone="protein"
              />
              <ProgressRing
                value={todaySum.kcal}
                max={goals.kcal}
                label={`${Math.round(todaySum.kcal)}`}
                sublabel="kcal"
                size={56}
                stroke={6}
                tone="kcal"
              />
            </div>
          </div>
          <MacroBars macros={todaySum} goals={goals} />
        </Card>

        {/* Gentle nudges */}
        {period === 'day' &&
          todayKey(anchor) === todayKey() &&
          (() => {
            const hour = new Date().getHours()
            const pct = goals.proteinG > 0 ? todaySum.protein / goals.proteinG : 0
            if (todayMeals.length === 0 && hour >= 14) {
              return (
                <div className="mb-5 flex gap-3 rounded-2xl border border-border/90 bg-surface px-4 py-3.5 shadow-soft">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">今日未影餐？都冇所謂</div>
                    <p className="text-[12px] text-muted leading-relaxed mt-0.5">
                      休息日唔使硬食到目標。想跟住就影一餐；想鬆啲就放低，聽日再嚟都得。
                    </p>
                  </div>
                </div>
              )
            }
            if (todayMeals.length > 0 && pct < 0.45 && hour >= 16) {
              return (
                <div className="mb-5 flex gap-3 rounded-2xl border border-border/90 bg-surface px-4 py-3.5 shadow-soft">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">蛋白仲差一截</div>
                    <p className="text-[12px] text-muted leading-relaxed mt-0.5">
                      而家大概 {Math.round(pct * 100)}%——晚啲加碟蛋／雞胸／豆腐都得，唔使一次過硬塞。
                    </p>
                  </div>
                </div>
              )
            }
            return null
          })()}

        {/* Month calendar heat (protein) */}
        {(period === 'month' || period === 'week') && (
          <Card className="mb-6">
            <CardTitle className="text-lg mb-1">飲食日曆</CardTitle>
            <CardDesc className="mb-4">色越深＝當日蛋白越多。撳日子就跳去嗰日。</CardDesc>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: monthStartWeekday }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const p = monthHeat.get(iso) || 0
                const intensity = p === 0 ? 0 : 0.15 + (p / heatMax) * 0.85
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => jumpToDay(iso)}
                    className="aspect-square rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-medium tabular-nums border border-border/60 hover:scale-105 transition touch-manipulation"
                    style={{
                      background:
                        p === 0
                          ? 'var(--surface, #fff)'
                          : `color-mix(in srgb, #0F766E ${Math.round(intensity * 100)}%, #FAFAF9)`,
                      color: intensity > 0.55 ? '#fff' : '#1A1A1A',
                    }}
                    title={`${iso}: ${Math.round(p)}g 蛋白`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {/* Camera CTA */}
        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--accent-soft),_transparent_50%)] pointer-events-none" />
          <div className="relative">
            <CardTitle className="text-xl mb-1">影相估營養</CardTitle>
            <CardDesc className="mb-5">
              每日免費 AI 估算 3 次 · 估完一定可以改數字。額用晒就自己改／聽日再試；登入可分開計額。
            </CardDesc>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="lg" className="flex-1" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-4 w-4" />
                影一餐
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                相簿
              </Button>
            </div>
            {quotaRemaining != null && (
              <p className="mt-3 text-[11px] text-muted">
                {quotaRemaining > 0
                  ? `今日仲剩 ${quotaRemaining} 次免費 AI`
                  : '今日免費 AI 額用晒 · 可以自己改數字或者聽日再試'}
              </p>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </div>
        </Card>

        {/* HK dishes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">港餐快加</h2>
            <Badge tone="muted">一掣入帳</Badge>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {HK_DISH_ESTIMATES.map((d, i) => (
              <motion.button
                key={d.name}
                type="button"
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={springSnappy}
                onClick={() => addDemoDish(i)}
                className="shrink-0 w-[148px] rounded-[20px] border border-border bg-surface p-3.5 text-left shadow-soft hover:shadow-hover transition"
              >
                <div className="text-sm font-medium mb-0.5">{d.name}</div>
                <div className="text-[10px] text-muted mb-2 line-clamp-1">{d.hint}</div>
                <div className="text-xs text-accent font-semibold tabular-nums">
                  {d.macros.protein}g 蛋白 · {d.macros.kcal} kcal
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* History list for selected period */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">
            {period === 'day' ? '今日食咗咩' : period === 'week' ? '呢個星期' : '呢個月'}
          </h2>
          <span className="text-xs text-muted">{periodMeals.length} 餐</span>
        </div>

        {periodMeals.length === 0 ? (
          <EmptyState
            className="mb-8"
            title={
              period === 'day'
                ? '今日未有記錄'
                : period === 'week'
                  ? '呢個星期未有記錄'
                  : '呢個月未有記錄'
            }
            description={
              period === 'day'
                ? '影低一餐，或者撳「香港常見」加示範。登入之後會入雲端歷史。'
                : '換去「日」計影一餐，或者撳上面箭嘴睇其他日子。登入之後週／月總計會齊啲。'
            }
            actionLabel="影一餐"
            onAction={() => cameraRef.current?.click()}
          />
        ) : (
          <Stagger className="space-y-3 mb-8">
            {periodMeals.map((m) => (
              <StaggerItem key={m.id}>
                <Card className="py-4">
                  <div className="flex gap-3">
                    {m.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageDataUrl}
                        alt=""
                        className="h-16 w-16 rounded-2xl object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
                        <Utensils className="h-5 w-5 text-accent" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-[11px] text-muted">
                            {new Date(m.createdAt).toLocaleString('zh-HK', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {mealTimeLabel(m.createdAt)}
                            {m.estimated && ' · 估算'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/[0.04]"
                            onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                            aria-label="改"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50"
                            onClick={() => removeMeal(m.id)}
                            aria-label="刪"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <Badge tone="accent">{m.macros.protein}g P</Badge>
                        <Badge>{m.macros.kcal} kcal</Badge>
                        <Badge tone="muted">{m.macros.carbs}g C</Badge>
                        <Badge tone="muted">{m.macros.fat}g F</Badge>
                      </div>
                      <div className="mt-2.5">
                        <ShareCardButton
                          kind="meal"
                          size="sm"
                          variant="soft"
                          label="分享呢餐"
                          payload={{
                            name: m.name,
                            kcal: m.macros.kcal,
                            protein: m.macros.protein,
                            carbs: m.macros.carbs,
                            fat: m.macros.fat,
                            dateLabel: new Date(m.createdAt).toLocaleString('zh-HK', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                            note: m.note,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {editingId === m.id && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                      {(['protein', 'kcal', 'carbs', 'fat'] as const).map((key) => (
                        <label key={key} className="text-[11px] text-muted">
                          {key === 'protein'
                            ? '蛋白 g'
                            : key === 'kcal'
                              ? '卡路里'
                              : key === 'carbs'
                                ? '碳水 g'
                                : '脂肪 g'}
                          <Input
                            type="number"
                            className="mt-1 h-9"
                            value={m.macros[key]}
                            onChange={(e) =>
                              updateMealMacros(m.id, {
                                macros: {
                                  ...m.macros,
                                  [key]: Number(e.target.value) || 0,
                                },
                                estimated: false,
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageTransition>

      <AnimatePresence>
        {draft && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-surface border border-border shadow-hover"
              initial={reduce ? false : { y: 40 }}
              animate={{ y: 0 }}
              exit={reduce ? undefined : { y: 24 }}
              transition={springSoft}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.previewUrl} alt="" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm"
                  aria-label="關閉"
                >
                  <X className="h-4 w-4" />
                </button>
                <Badge className="absolute bottom-3 left-3" tone="accent">
                  {draft.status === 'estimating'
                    ? 'AI 估緊…'
                    : draft.source === 'ai'
                      ? 'AI 估嘅 · 可以改'
                      : draft.source === 'manual'
                        ? '自己改數字'
                        : '示範估算 · 可以改'}
                </Badge>
              </div>
              <div className="p-5">
                {draft.status === 'estimating' ? (
                  <div className="space-y-3 py-2">
                    <div className="h-7 w-40 rounded-xl bg-border skeleton-pulse" />
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-16 rounded-2xl bg-border/70 skeleton-pulse" />
                      ))}
                    </div>
                    <p className="text-xs text-muted text-center pt-2">認緊碟餸…等陣</p>
                  </div>
                ) : (
                  <>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="font-serif text-xl h-12 mb-4 border-0 shadow-none px-0 focus:ring-0"
                    />
                    <p className="text-[11px] text-muted mb-2">卡路里／蛋白／碳水／脂肪 · 撳格直接改，入日記前隨時調</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {(
                        [
                          { k: 'kcal' as const, label: '卡路里', unit: 'kcal' },
                          { k: 'protein' as const, label: '蛋白', unit: 'g' },
                          { k: 'carbs' as const, label: '碳水', unit: 'g' },
                          { k: 'fat' as const, label: '脂肪', unit: 'g' },
                        ]
                      ).map((item) => (
                        <label
                          key={item.k}
                          className="rounded-2xl border border-border/90 bg-[#fafaf9] px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/35 transition"
                        >
                          <div className="text-[10px] text-muted mb-1">{item.label}</div>
                          <div className="flex items-baseline gap-1">
                            <input
                              type="number"
                              inputMode="decimal"
                              className="w-full bg-transparent text-lg font-semibold tabular-nums outline-none"
                              value={liveMacros![item.k]}
                              onChange={(e) => {
                                const nextVal = Number(e.target.value) || 0
                                const portion = draft.portion || 1
                                setDraft({
                                  ...draft,
                                  baseMacros: {
                                    ...draft.baseMacros,
                                    [item.k]: Math.round((nextVal / portion) * 10) / 10,
                                  },
                                  estimated: false,
                                })
                              }}
                            />
                            <span className="text-[10px] text-muted shrink-0">{item.unit}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <label className="block mb-5">
                      <div className="flex justify-between text-xs text-muted mb-2">
                        <span>份量調整</span>
                        <span className="tabular-nums text-accent font-medium">
                          {Math.round(draft.portion * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={2}
                        step={0.05}
                        value={draft.portion}
                        onChange={(e) => setDraft({ ...draft, portion: Number(e.target.value) })}
                        className="w-full accent-[var(--accent)] h-2"
                      />
                      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
                        <span>¼</span>
                        <span>正常</span>
                        <span>雙倍</span>
                      </div>
                    </label>
                    <Button size="lg" className="w-full" onClick={confirmDraft}>
                      <Check className="h-4 w-4" />
                      入飲食日記
                    </Button>
                    {draft.note && (
                      <p className="text-[11px] text-muted text-center mt-2 leading-relaxed">
                        {draft.note}
                      </p>
                    )}
                    <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">
                      {draft.source === 'manual'
                        ? '今日免費 AI 額用晒或者 AI 暫時唔得都冇問題——自己改完數字再入日記就得。'
                        : '估算啫，唔係實驗室數字。登入後會入雲端歷史，之後可以睇月計。'}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 max-w-[min(92vw,420px)] rounded-2xl border border-border bg-foreground text-background px-4 py-3 text-xs shadow-hover"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={springSoft}
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
