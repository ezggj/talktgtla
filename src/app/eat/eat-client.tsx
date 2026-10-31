'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CopyPlus,
  ImagePlus,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Salad,
  Search,
  Trash2,
  Undo2,
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
  DISH_CATEGORY_LABEL,
  DISH_BRAND_LABEL,
  clubProteinDishes,
  supplementDishes,
  filterHkDishes,
  estimateFromFoodName,
  mockEstimateFromFile,
  scaleMacros,
  type DishBrand,
  type DishCategory,
} from '@/lib/fitness/meals-demo'
import { ProteinWeekCard } from '@/components/fitness/protein-week-card'
import { ProteinReminderCard } from '@/components/fitness/protein-reminder-card'
import { compressMealImage } from '@/lib/fitness/compress-image'
import { getOrCreateEatGuestId } from '@/lib/fitness/eat-guest-id'
import {
  enqueueMeal,
  flushOfflineQueue,
} from '@/lib/fitness/offline-queue'

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
import { SyncToast } from '@/components/ui/sync-toast'
import { ShareCardButton } from '@/components/fitness/share-card-button'
import {
  evaluateFitnessAchievements,
  unlockFitnessAchievements,
  loadFitnessUnlocked,
  fitnessAchievementById,
} from '@/lib/fitness/achievements'
import { cn } from '@/lib/utils'
import { checkProteinEveningReminder } from '@/lib/fitness/protein-reminder'

type Draft = {
  previewUrl: string
  file: File | null
  fileName: string
  status: 'estimating' | 'ready'
  name: string
  baseMacros: MealMacros
  /** Frozen when AI／示範估算到位 — 用嚟對比「你改完 vs AI 估」 */
  aiSnapshot?: MealMacros
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

function periodMacroTip(opts: {
  period: PeriodKind
  protein: number
  kcal: number
  proteinGoal: number
  kcalGoal: number
  spanDays: number
  loggedDays: number
}) {
  const budgetP = opts.proteinGoal * opts.spanDays
  const budgetK = opts.kcalGoal * opts.spanDays
  const leftP = Math.round(budgetP - opts.protein)
  const leftK = Math.round(budgetK - opts.kcal)
  const avg = opts.loggedDays > 0 ? Math.round(opts.protein / opts.loggedDays) : 0
  if (opts.period === 'day') {
    if (leftP <= 0 && leftK <= 0) return '呢日蛋白同卡路里都過咗目標——聽日再調就得。'
    if (leftP <= 0) return `蛋白到標。卡路里仲剩約 ${Math.max(0, leftK)} kcal。`
    if (leftK <= 0) return `卡路里過咗。蛋白仲差 ${leftP}g——加蛋白、少加澱粉。`
    return `仲差約 ${leftP}g 蛋白 · ${leftK} kcal。影一餐或者港式快加都得。`
  }
  const noun = opts.period === 'week' ? '呢個星期' : '呢個月'
  if (leftP <= 0) {
    return `${noun}蛋白已過全日目標。有記日子日均約 ${avg}g，穩陣就得。`
  }
  return `${noun}對住每日 ${opts.proteinGoal}g × ${opts.spanDays} 日，仲差約 ${leftP}g 蛋白。有記 ${opts.loggedDays} 日，日均 ${avg}g。`
}

export function EatClient() {
  const reduce = useReducedMotion()
  const { ready: authReady, user } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [goals, setGoals] = useState({ proteinG: 150, kcal: 2200 })
  const [dishCat, setDishCat] = useState<DishCategory | '全部'>('全部')
  const [dishBrand, setDishBrand] = useState<DishBrand>('全部')
  const [dishQuery, setDishQuery] = useState('')
  const [quickPortion, setQuickPortion] = useState(1)
  const [undoMeal, setUndoMeal] = useState<MealEntry | null>(null)
  const [mealSlotFilter, setMealSlotFilter] = useState<'全部' | '早餐' | '午餐' | '下午茶' | '晚餐' | '宵夜'>('全部')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [quotaLimit, setQuotaLimit] = useState(3)
  const [reEstimating, setReEstimating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKind>('day')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [buckets, setBuckets] = useState<MealPeriodBucket[]>([])
  const [syncing, setSyncing] = useState(false)
  const [cloudNote, setCloudNote] = useState<string | null>(null)
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [eatFocus, setEatFocus] = useState<'photo' | 'hk' | 'club' | 'manual' | null>(null)
  const manualRef = useRef<HTMLDivElement>(null)
  const hkRef = useRef<HTMLDivElement>(null)
  const clubRef = useRef<HTMLDivElement>(null)

  const scrollEat = (id: 'photo' | 'hk' | 'club' | 'manual') => {
    setEatFocus(id)
    window.setTimeout(() => {
      const el =
        id === 'photo'
          ? document.getElementById('eat-camera')
          : id === 'hk'
            ? hkRef.current
            : id === 'club'
              ? clubRef.current
              : manualRef.current
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const openManualEntry = () => {
    setEatFocus('manual')
    setDraft({
      previewUrl: '',
      file: null,
      fileName: 'manual',
      status: 'ready',
      name: '',
      baseMacros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      portion: 1,
      estimated: false,
      source: 'manual',
      note: '自己入數字 · 唔使影相',
    })
  }

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

  // Peek free AI quota for the day (guest / user)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const guest = getOrCreateEatGuestId()
        const res = await fetch('/api/eat/estimate', {
          headers: guest ? { 'x-ttl-guest-id': guest } : undefined,
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        if (typeof data.remaining === 'number') setQuotaRemaining(data.remaining)
        if (typeof data.limit === 'number') setQuotaLimit(data.limit)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])


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
        if (result.workoutsUploaded > 0 || result.mealsUploaded > 0) {
          setSyncToast(result.note)
        }
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

  useEffect(() => {
    if (!user) return
    const onOnline = () => {
      void (async () => {
        try {
          const supabase = createClient()
          const flushed = await flushOfflineQueue(supabase, user.id)
          if (flushed.note) setCloudNote(flushed.note)
        } catch {
          /* ignore */
        }
      })()
    }
    void onOnline()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user])





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

  const periodSpanDays = useMemo(() => {
    if (period === 'week') return 7
    if (period === 'month') {
      return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
    }
    return 1
  }, [period, anchor])

  const periodLoggedDays = useMemo(() => {
    return new Set(periodMeals.map((m) => todayKey(new Date(m.createdAt)))).size
  }, [periodMeals])

  const todayMeals = useMemo(() => {
    const day = todayKey(new Date())
    return meals
      .filter((m) => isSameDay(m.createdAt, day))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [meals])

  const todaySum = useMemo(() => sumMacros(todayMeals), [todayMeals])

  const filteredPeriodMeals = useMemo(() => {
    if (period !== 'day' || mealSlotFilter === '全部') return periodMeals
    return periodMeals.filter((m) => mealTimeLabel(m.createdAt) === mealSlotFilter)
  }, [period, periodMeals, mealSlotFilter])

  const remainProtein = Math.max(0, Math.round(goals.proteinG - todaySum.protein))
  const remainKcal = Math.max(0, Math.round(goals.kcal - todaySum.kcal))
  const overProtein = todaySum.protein > goals.proteinG
  const overKcal = todaySum.kcal > goals.kcal

  useEffect(() => {
    if (period !== 'day' && mealSlotFilter !== '全部') setMealSlotFilter('全部')
  }, [period, mealSlotFilter])

  /** MFP 風格：最近常食（去重，最多 8 個）一掣再加 */
  const recentMeals = useMemo(() => {
    const seen = new Set<string>()
    const out: MealEntry[] = []
    for (const m of [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const key = m.name.replace(/（半份|一份半|兩份）/g, '').trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(m)
      if (out.length >= 8) break
    }
    return out
  }, [meals])

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
    if (!msg.includes('可還原')) setUndoMeal(null)
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
        if (data.quota?.limit != null) setQuotaLimit(data.quota.limit)
        if (typeof data.remaining === 'number') setQuotaRemaining(data.remaining)
        if (typeof data.limit === 'number') setQuotaLimit(data.limit)

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
                    '今日免費 AI 用晒啦——登入／聽日再試，或者而家自己改數字',
                }
              : null
          )
          setQuotaRemaining(0)
          showToast(
            data.error ||
              '今日免費 AI 用晒啦——登入／聽日再試，或者而家自己改數字'
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
                aiSnapshot: { ...data.macros! },
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
                aiSnapshot: billingish ? undefined : { ...est.macros },
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
      if (typeof navigator !== 'undefined' && navigator.onLine === false && changed) {
        enqueueMeal(changed)
        setCloudNote('離線中——已暫存，有網會上雲')
        return
      }
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
      if (changed) enqueueMeal(changed)
      setCloudNote(e instanceof Error ? `${e.message} · 已暫存離線` : '存雲端唔到 · 已暫存離線')
    }
  }

  const applyNameEstimate = (
    macros: MealMacros,
    note: string,
    source: 'ai' | 'mock' | 'manual',
    displayName?: string
  ) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            name: displayName?.trim() || prev.name,
            baseMacros: {
              kcal: macros.kcal,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
              fiber: macros.fiber,
            },
            estimated: true,
            source,
            note,
          }
        : null
    )
  }

  const reEstimateFromName = async () => {
    if (!draft || draft.status !== 'ready') return
    const name = draft.name.trim()
    if (!name) {
      showToast('請先寫食物名稱')
      return
    }
    setReEstimating(true)
    try {
      const local = estimateFromFoodName(name)
      if (local && local.confidence >= 0.55) {
        applyNameEstimate(local.macros, local.note, 'mock')
        showToast(`已按「${name}」重估 · ${local.macros.kcal} kcal`)
        return
      }

      const guestId = getOrCreateEatGuestId()
      const res = await fetch('/api/eat/estimate-by-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ttl-guest-id': guestId,
        },
        body: JSON.stringify({ name, tableOnly: false }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        name?: string
        macros?: MealMacros
        note?: string
        source?: 'table' | 'ai'
        error?: string
        code?: string
      }

      if (res.ok && data.macros) {
        applyNameEstimate(
          data.macros,
          data.note || '按名重估',
          data.source === 'ai' ? 'ai' : 'mock',
          data.name
        )
        showToast(`已按「${data.name || name}」重估 · ${data.macros.kcal} kcal`)
        return
      }

      if (local) {
        applyNameEstimate(local.macros, local.note + ' · 後備表', 'mock')
        showToast(`已用本地表粗估 · ${local.macros.kcal} kcal`)
        return
      }

      showToast(data.error || '估唔到呢個名——試改名或者自己改數字')
    } catch {
      const local = estimateFromFoodName(name)
      if (local) {
        applyNameEstimate(local.macros, local.note, 'mock')
        showToast(`離線／失敗 · 已用本地表粗估`)
      } else {
        showToast('重估失敗——試改名或者自己改數字')
      }
    } finally {
      setReEstimating(false)
    }
  }

  const reEstimateSavedMeal = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('請先寫食物名稱')
      return
    }
    setReEstimating(true)
    try {
      let macros: MealMacros | null = null
      let note = '按名重估'
      const local = estimateFromFoodName(trimmed)
      if (local && local.confidence >= 0.55) {
        macros = local.macros
        note = local.note
      } else {
        const guestId = getOrCreateEatGuestId()
        const res = await fetch('/api/eat/estimate-by-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ttl-guest-id': guestId,
          },
          body: JSON.stringify({ name: trimmed }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          macros?: MealMacros
          note?: string
          error?: string
        }
        if (res.ok && data.macros) {
          macros = data.macros
          note = data.note || note
        } else if (local) {
          macros = local.macros
          note = local.note
        } else {
          showToast(data.error || '估唔到呢個名')
          return
        }
      }
      updateMealMacros(id, {
        name: trimmed,
        macros,
        estimated: true,
        note,
      })
      showToast(`已按「${trimmed}」重估 · ${macros.kcal} kcal`)
    } finally {
      setReEstimating(false)
    }
  }

  const confirmDraft = () => {

    if (!draft || draft.status !== 'ready' || !liveMacros) return
    const entry: MealEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: draft.name.trim() || '手動記錄',
      imageDataUrl: draft.previewUrl || undefined,
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
    if (!victim) return
    const next = meals.filter((m) => m.id !== id)
    void persistList(next, undefined, null, victim)
    setUndoMeal(victim)
    showToast(`已刪「${victim.name}」· 可還原`)
  }

  const undoRemoveMeal = () => {
    if (!undoMeal) return
    const restored = { ...undoMeal }
    const next = [restored, ...meals.filter((m) => m.id !== restored.id)]
    setUndoMeal(null)
    void persistList(next, restored)
    showToast(`已還原「${restored.name}」`)
  }

  const reAddMeal = (m: MealEntry) => {
    const entry: MealEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: m.name,
      macros: { ...m.macros },
      portion: m.portion ?? 1,
      estimated: m.estimated,
      note: m.note,
      source: m.source === 'ai' ? 'mock' : m.source,
    }
    const next = [entry, ...meals]
    void persistList(next, entry)
    showToast(`再食一次「${entry.name}」`)
  }

  const updateMealMacros = (id: string, patch: Partial<MealEntry>) => {
    const next = meals.map((m) => (m.id === id ? { ...m, ...patch, source: 'manual' as const } : m))
    const changed = next.find((m) => m.id === id)
    void persistList(next, changed)
  }

  const addDemoDish = (idx: number) => {
    const dish = HK_DISH_ESTIMATES[idx]
    if (!dish) return
    const portion = quickPortion
    const macros = portion === 1 ? { ...dish.macros } : scaleMacros(dish.macros, portion)
    const portionLabel =
      portion === 0.5 ? '半份' : portion === 1.5 ? '一份半' : portion === 2 ? '兩份' : '一份'
    const entry: MealEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: portion === 1 ? dish.name : `${dish.name}（${portionLabel}）`,
      macros,
      portion,
      estimated: true,
      note: dish.hint,
      source: 'mock',
    }
    const next = [entry, ...meals]
    void persistList(next, entry)
    showToast(`已快加「${entry.name}」`)
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


  useEffect(() => {
    if (!ready) return
    void checkProteinEveningReminder()
    const id = window.setInterval(() => {
      void checkProteinEveningReminder()
    }, 15 * 60 * 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void checkProteinEveningReminder()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ready])

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
          compact
          eyebrow="飲食"
          title="影低呢餐"
          description="影相 · 港式快加 · 補劑 · gym撚常食 · 手動"
        />

        {/* Four entry paths — 第一屏主入口 */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              {
                id: 'photo' as const,
                title: '影相 AI',
                desc: '影一餐估營養',
                icon: Camera,
                onClick: () => scrollEat('photo'),
              },
              {
                id: 'hk' as const,
                title: '港式快加',
                desc: '茶記／小食',
                icon: Utensils,
                onClick: () => {
                  setDishCat('茶記')
                  scrollEat('hk')
                },
              },
              {
                id: 'club' as const,
                title: 'gym撚常食',
                desc: 'gym 食堂模板',
                icon: Salad,
                onClick: () => {
                  setDishCat('gym撚常食')
                  scrollEat('club')
                },
              },
              {
                id: 'manual' as const,
                title: '手動',
                desc: '自己填數字',
                icon: PenLine,
                onClick: () => {
                  scrollEat('manual')
                  openManualEntry()
                },
              },
            ] as const
          ).map(({ id, title, desc, icon: Icon, onClick }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className={cn(
                'rounded-2xl border bg-surface p-3 text-left shadow-soft transition touch-manipulation hover:shadow-hover',
                eatFocus === id
                  ? 'border-accent ring-1 ring-accent/30 bg-accent-soft/40'
                  : 'border-border'
              )}
            >
              <Icon className="h-4 w-4 text-accent mb-1.5" />
              <div className="text-sm font-semibold leading-tight">{title}</div>
              <div className="text-[10px] text-muted mt-0.5 leading-snug">{desc}</div>
            </button>
          ))}
        </div>

        {!user && (
          <div className="mb-3">
            <LoginPromptBanner />
          </div>
        )}
        {user && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-muted">
            <Cloud className={cn('h-3.5 w-3.5 text-accent', syncing && 'animate-pulse')} />
            {syncing ? 'sync 緊…' : cloudNote || '飲食已上雲'}
          </div>
        )}

        {/* Period switcher */}
        <div className="mb-3 flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 flex gap-1 p-1 rounded-2xl bg-surface-muted border border-border">
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
                  <div className="text-[11px] text-muted tabular-nums">
                    {periodMeals.length} 餐
                    {period !== 'day' && periodLoggedDays > 0 ? ` · 有記 ${periodLoggedDays} 日` : ''}
                  </div>
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
              <p className="mb-2 text-center text-[10px] font-semibold tracking-wide text-muted">
                {period === 'day' ? '呢日合計' : '呢段合計'}
              </p>
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
                    className="rounded-2xl bg-surface-muted border border-border px-1.5 sm:px-2 py-3 min-w-0"
                  >
                    <div className={cn('text-sm sm:text-base font-semibold tabular-nums truncate', x.tone)}>
                      {x.v}
                    </div>
                    <div className="text-[10px] text-muted">{x.label}</div>
                  </div>
                ))}
              </div>
              {periodMeals.length === 0 ? (
                <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
                  呢段未有餐。下面可以港式快加、影相，或者手動入數。
                </p>
              ) : (
                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  {period !== 'day' && (
                    <>
                      <div className="mb-1.5 flex justify-between text-[10px] text-muted">
                        <span>
                          蛋白進度 · 日均{' '}
                          {Math.round(periodSum.protein / Math.max(1, periodLoggedDays))}g
                        </span>
                        <span className="tabular-nums">{Math.round(periodSum.protein)}g</span>
                      </div>
                      <ProgressBar
                        value={periodSum.protein}
                        max={Math.max(1, goals.proteinG * periodSpanDays)}
                        tone="protein"
                        height="md"
                      />
                    </>
                  )}
                  <p className="text-[12px] leading-relaxed text-muted">
                    {periodMacroTip({
                      period,
                      protein: periodSum.protein,
                      kcal: periodSum.kcal,
                      proteinGoal: goals.proteinG,
                      kcalGoal: goals.kcal,
                      spanDays: periodSpanDays,
                      loggedDays: periodLoggedDays,
                    })}
                  </p>
                </div>
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
          {(todayMeals.length > 0 || remainProtein > 0 || remainKcal > 0) && (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              {overProtein && overKcal
                ? '今日蛋白同卡路里都過咗目標——休息日／增肌日都得，聽日再調。'
                : overProtein
                  ? `蛋白已過目標；卡路里仲剩約 ${remainKcal} kcal（睇你目標）。`
                  : overKcal
                    ? `卡路里已過目標；蛋白仲差 ${remainProtein}g。`
                    : remainProtein === 0 && remainKcal === 0
                      ? '今日目標差唔多齊——叻呀。'
                      : `仲差約 ${remainProtein}g 蛋白 · ${remainKcal} kcal——影一餐或港式快加補返。`}
            </p>
          )}
        </Card>

        {/* Weekly protein — high visibility near top */}
        <div className="mb-5">
          <ProteinWeekCard
            meals={meals}
            proteinGoal={goals.proteinG}
            window={
              period === 'day'
                ? undefined
                : {
                    fromMs: range.from.getTime(),
                    toMs: range.to.getTime(),
                    noun: period === 'week' ? '呢個星期' : '呢個月',
                  }
            }
            dateLabel={period === 'day' ? undefined : range.label}
            onLogMeal={() => {
              const el = document.getElementById('eat-camera')
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />

          <div className="mb-4">
            <ProteinReminderCard />
          </div>
        </div>

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
            <CardDesc className="mb-3">
              色越深＝當日蛋白越多。金圈＝到標（約 9 成目標）。撳日子跳去嗰日。
            </CardDesc>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-md border border-border bg-surface" />
                無記錄
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-md bg-accent/35" />
                有記
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-md bg-accent ring-2 ring-[#F59E0B]" />
                到標
              </span>
            </div>
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
                const hit = goals.proteinG > 0 && p >= goals.proteinG * 0.9
                const selected = iso === todayKey(anchor)
                const dayDate = new Date(`${iso}T12:00:00`)
                const inFocus =
                  period !== 'week' || (dayDate >= range.from && dayDate < range.to)
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => jumpToDay(iso)}
                    className={cn(
                      'aspect-square rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-medium tabular-nums border transition touch-manipulation',
                      hit ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/80' : 'border-border/60',
                      selected && 'outline outline-2 outline-offset-1 outline-accent',
                      !inFocus && 'opacity-35'
                    )}
                    style={{
                      background:
                        p === 0
                          ? 'var(--surface, #fff)'
                          : `color-mix(in srgb, #0F766E ${Math.round(intensity * 100)}%, #FAFAF9)`,
                      color: intensity > 0.55 ? '#fff' : '#1A1A1A',
                    }}
                    title={`${iso}: ${Math.round(p)}g 蛋白${hit ? ' · 到標' : ''}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            {monthHeat.size === 0 ? (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                呢個月未有蛋白紀錄。影一餐或者港式快加，格仔就會著色。
              </p>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                {(() => {
                  let logged = 0
                  let hits = 0
                  monthHeat.forEach((p, iso) => {
                    if (period === 'week') {
                      const d = new Date(`${iso}T12:00:00`)
                      if (d < range.from || d >= range.to) return
                    }
                    if (p > 0) logged += 1
                    if (goals.proteinG > 0 && p >= goals.proteinG * 0.9) hits += 1
                  })
                  const focus = period === 'week' ? '呢個星期' : '呢個月'
                  return `${focus}有記 ${logged} 日，到標 ${hits} 日。撳格仔睇嗰日食咗咩。`
                })()}
              </p>
            )}
          </Card>
        )}

        {/* Camera CTA */}
        <Card id="eat-camera" className="mb-6 relative overflow-hidden scroll-mt-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--accent-soft),_transparent_50%)] pointer-events-none" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-1">
              <CardTitle className="text-xl">影相 AI</CardTitle>
              {quotaRemaining != null && (
                <div
                  className="flex items-center gap-1 pt-1"
                  aria-label={`今日仲剩 ${quotaRemaining} 次`}
                  title={`每日 ${quotaLimit} 次免費 AI`}
                >
                  {Array.from({ length: quotaLimit }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < quotaRemaining
                          ? 'h-2 w-2 rounded-full bg-accent'
                          : 'h-2 w-2 rounded-full bg-border'
                      }
                    />
                  ))}
                </div>
              )}
            </div>
            <CardDesc className="mb-5">
              每日 {quotaLimit} 次免費 AI · 估完一定可以改數字。用晒就自己改／聽日再嚟
              {!user ? '；登入可分開計額' : ''}。
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
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span>
                  {quotaRemaining > 0
                    ? `今日仲剩 ${quotaRemaining} 次`
                    : '今日免費 AI 用晒啦 · 可以自己改數字或者聽日再試'}
                </span>
                {quotaRemaining === 0 && !user && (
                  <Link href="/me" className="font-medium text-accent hover:underline">
                    去登入分開計額
                  </Link>
                )}
              </div>
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

        {recentMeals.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-xl">最近常食</h2>
              <Badge tone="accent">再食一次</Badge>
            </div>
            <p className="text-[11px] text-muted mb-2 px-0.5 leading-relaxed">
              你最近記過嘅餐——一掣再入，似 MyFitnessPal 最近食物。
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {recentMeals.map((m) => (
                <motion.button
                  key={m.id}
                  type="button"
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  transition={springSnappy}
                  onClick={() => reAddMeal(m)}
                  className="shrink-0 w-[148px] rounded-[20px] border border-accent/20 bg-accent-soft/15 p-3.5 text-left shadow-soft hover:shadow-hover transition"
                >
                  <div className="text-[10px] text-accent mb-0.5">再食一次</div>
                  <div className="text-sm font-medium mb-0.5 line-clamp-1">{m.name}</div>
                  <div className="text-xs text-accent font-semibold tabular-nums">
                    {m.macros.protein}g 蛋白 · {m.macros.kcal} kcal
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 港式快加 */}
        <div id="eat-hk" ref={hkRef} className="mb-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">港式快加</h2>
            <Badge tone="muted">搜尋 · 品牌 · 份量</Badge>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={dishQuery}
              onChange={(e) => setDishQuery(e.target.value)}
              placeholder="搵譚仔、叉燒飯、蛋白棒…"
              aria-label="搜尋港式餐"
              className="pl-9"
            />
            {dishQuery ? (
              <button
                type="button"
                aria-label="清空搜尋"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-foreground"
                onClick={() => setDishQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 mb-1.5">
            {(['全部', '譚仔', '茶記街坊', '大家樂', '大快活', '便利店補劑'] as DishBrand[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setDishBrand(b)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] border touch-manipulation',
                  dishBrand === b
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : 'border-border text-muted hover:text-foreground'
                )}
              >
                {DISH_BRAND_LABEL[b]}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 mb-1.5">
            {(['全部', '茶記', '小食', '早餐', '補劑'] as const).map((c) => {
              const active =
                c === '全部'
                  ? dishCat === '全部' || dishCat === 'gym撚常食'
                  : dishCat === c
              return (
              <button
                key={c}
                type="button"
                onClick={() => setDishCat(c === '全部' ? '全部' : c)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] border touch-manipulation',
                  active
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : 'border-border text-muted hover:text-foreground'
                )}
              >
                {c === '全部' ? '全部類別' : DISH_CATEGORY_LABEL[c]}
              </button>
            )})}
          </div>
          <div className="flex items-center gap-1.5 mb-2 px-0.5">
            <span className="text-[10px] text-muted shrink-0">份量</span>
            {([0.5, 1, 1.5, 2] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuickPortion(p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] border touch-manipulation tabular-nums',
                  quickPortion === p
                    ? 'border-accent bg-accent text-white font-semibold'
                    : 'border-border text-muted hover:text-foreground'
                )}
              >
                {p === 0.5 ? '半份' : p === 1 ? '1 份' : p === 1.5 ? '1½' : '2 份'}
              </button>
            ))}
          </div>
          {(() => {
            const list = filterHkDishes({
              cat: dishCat === 'gym撚常食' ? '全部' : dishCat,
              brand: dishBrand,
              q: dishQuery,
            })
            if (list.length === 0) {
              return (
                <EmptyState
                  compact
                  emoji="🔎"
                  title="搵唔到呢餐"
                  description="試改關鍵字，或者撳「全部品牌」。唔見嘅可以手動入數。"
                  actionLabel="手動入數"
                  onAction={openManualEntry}
                  secondaryLabel="清空篩選"
                  onSecondary={() => {
                    setDishQuery('')
                    setDishBrand('全部')
                    setDishCat('全部')
                  }}
                />
              )
            }
            return (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {list.map((d) => {
              const i = HK_DISH_ESTIMATES.findIndex((x) => x.name === d.name)
              const shown = quickPortion === 1 ? d.macros : scaleMacros(d.macros, quickPortion)
              return (
              <motion.button
                key={d.name}
                type="button"
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={springSnappy}
                onClick={() => addDemoDish(i)}
                className="shrink-0 w-[148px] rounded-[20px] border border-border bg-surface p-3.5 text-left shadow-soft hover:shadow-hover transition"
              >
                <div className="text-[10px] text-accent mb-0.5">{DISH_CATEGORY_LABEL[d.category]}</div>
                <div className="text-sm font-medium mb-0.5">{d.name}</div>
                <div className="text-[10px] text-muted mb-2 line-clamp-1">{d.hint}</div>
                <div className="text-xs text-accent font-semibold tabular-nums">
                  {shown.protein}g 蛋白 · {shown.kcal} kcal
                </div>
              </motion.button>
            )})}
          </div>
            )
          })()}
        </div>

        {/* gym撚常食 */}
        <div id="eat-club" ref={clubRef} className="mb-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">gym撚常食</h2>
            <Badge tone="accent">gym 食堂</Badge>
          </div>
          <p className="text-[11px] text-muted mb-2 px-0.5 leading-relaxed">
            練完一掣入蛋白餐模板——配一週蛋白口語總結更好用。
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {clubProteinDishes().map((d) => {
              const i = HK_DISH_ESTIMATES.findIndex((x) => x.name === d.name)
              return (
              <motion.button
                key={d.name}
                type="button"
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={springSnappy}
                onClick={() => addDemoDish(i)}
                className="shrink-0 w-[148px] rounded-[20px] border border-accent/25 bg-accent-soft/20 p-3.5 text-left shadow-soft hover:shadow-hover transition"
              >
                <div className="text-[10px] text-accent mb-0.5">{DISH_CATEGORY_LABEL[d.category]}</div>
                <div className="text-sm font-medium mb-0.5">{d.name}</div>
                <div className="text-[10px] text-muted mb-2 line-clamp-1">{d.hint}</div>
                <div className="text-xs text-accent font-semibold tabular-nums">
                  {d.macros.protein}g 蛋白 · {d.macros.kcal} kcal
                </div>
              </motion.button>
            )})}
          </div>
        </div>


        {/* 補劑／乳清 */}
        <div id="eat-supp" className="mb-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">補劑／乳清</h2>
            <Badge tone="accent">一掣加</Badge>
          </div>
          <p className="text-[11px] text-muted mb-2 px-0.5 leading-relaxed">
            訓練後乳清、肌酸、蛋白棒——唔使自己計。
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {supplementDishes().map((d) => {
              const i = HK_DISH_ESTIMATES.findIndex((x) => x.name === d.name)
              return (
              <motion.button
                key={d.name}
                type="button"
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={springSnappy}
                onClick={() => addDemoDish(i)}
                className="shrink-0 w-[148px] rounded-[20px] border border-border bg-surface p-3.5 text-left shadow-soft hover:shadow-hover transition"
              >
                <div className="text-[10px] text-accent mb-0.5">{DISH_CATEGORY_LABEL[d.category]}</div>
                <div className="text-sm font-medium mb-0.5">{d.name}</div>
                <div className="text-[10px] text-muted mb-2 line-clamp-1">{d.hint}</div>
                <div className="text-xs text-accent font-semibold tabular-nums">
                  {d.macros.protein}g 蛋白 · {d.macros.kcal} kcal
                </div>
              </motion.button>
            )})}
          </div>
        </div>

        {/* 手動入數 */}
        <div id="eat-manual" ref={manualRef} className="mb-8 scroll-mt-24">
          <Card className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">手動入數</CardTitle>
                <CardDesc className="mt-1.5 mb-3">
                  唔使影相——自己填名同卡路里／蛋白／碳水／脂肪。
                </CardDesc>
                <Button size="lg" variant="secondary" onClick={openManualEntry}>
                  <PenLine className="h-4 w-4" />
                  開手動表格
                </Button>
              </div>
              <PenLine className="h-5 w-5 text-accent shrink-0 mt-1" />
            </div>
          </Card>
        </div>

        {/* History list for selected period */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl">
            {period === 'day' ? '今日食咗咩' : period === 'week' ? '呢個星期' : '呢個月'}
          </h2>
          <span className="text-xs text-muted">
            {period === 'day' && mealSlotFilter !== '全部'
              ? `${filteredPeriodMeals.length}/${periodMeals.length} 餐`
              : `${periodMeals.length} 餐`}
          </span>
        </div>

        {period === 'day' && periodMeals.length > 0 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
            {(['全部', '早餐', '午餐', '下午茶', '晚餐', '宵夜'] as const).map((slot) => {
              const count =
                slot === '全部'
                  ? periodMeals.length
                  : periodMeals.filter((m) => mealTimeLabel(m.createdAt) === slot).length
              if (slot !== '全部' && count === 0) return null
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setMealSlotFilter(slot)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium touch-manipulation',
                    mealSlotFilter === slot
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-muted hover:text-foreground'
                  )}
                >
                  {slot}
                  {count > 0 ? ` · ${count}` : ''}
                </button>
              )
            })}
          </div>
        )}

        {periodMeals.length === 0 ? (
          <div className="mb-8">
            <EmptyState
              emoji="🍜"
              title={
                period === 'day'
                  ? '今日未記餐——一掣加就得'
                  : period === 'week'
                    ? '呢個星期未有記錄'
                    : '呢個月未有記錄'
              }
              description={
                period === 'day'
                  ? '港式快加最方便（譚仔／茶餐廳／大家樂）；想蛋白就 gym撚常食。'
                  : '切去「日」先加一餐，或者撳箭嘴睇其他日子。'
              }
              actionLabel={period === 'day' ? '港式快加' : '睇今日'}
              onAction={() => {
                if (period !== 'day') {
                  setPeriod('day')
                  setAnchor(startOfDay(new Date()))
                }
                // defer scroll so day UI mounts
                requestAnimationFrame(() => scrollEat('hk'))
              }}
              secondaryLabel={period === 'day' ? 'gym撚常食' : '港式快加'}
              onSecondary={() => {
                if (period !== 'day') {
                  setPeriod('day')
                  setAnchor(startOfDay(new Date()))
                  requestAnimationFrame(() => scrollEat('hk'))
                  return
                }
                scrollEat('club')
              }}
            />
            {period === 'day' && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted hover:text-foreground touch-manipulation"
                >
                  影一餐
                </button>
                <button
                  type="button"
                  onClick={openManualEntry}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted hover:text-foreground touch-manipulation"
                >
                  手動入數
                </button>
              </div>
            )}
          </div>
        ) : filteredPeriodMeals.length === 0 ? (
          <div className="mb-8 rounded-[20px] border border-dashed border-border bg-surface px-5 py-8 text-center">
            <p className="text-sm text-muted">呢個時段未有餐——換個篩選或者快加一餐。</p>
            <button
              type="button"
              className="mt-3 text-[12px] font-semibold text-accent touch-manipulation"
              onClick={() => setMealSlotFilter('全部')}
            >
              睇全部時段
            </button>
          </div>
        ) : (
          <Stagger className="space-y-3 mb-8">
            {filteredPeriodMeals.map((m) => (
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
                            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent-soft"
                            onClick={() => reAddMeal(m)}
                            aria-label="再食一次"
                            title="再食一次"
                          >
                            <CopyPlus className="h-3.5 w-3.5" />
                          </button>
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
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <label className="block text-[11px] text-muted">
                        食物名稱
                        <Input
                          className="mt-1 h-9"
                          value={m.name}
                          onChange={(e) =>
                            updateMealMacros(m.id, {
                              name: e.target.value,
                              estimated: false,
                            })
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        className="w-full"
                        disabled={reEstimating || !m.name.trim()}
                        onClick={() => void reEstimateSavedMeal(m.id, m.name)}
                      >
                        {reEstimating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {reEstimating ? '重估緊…' : '按名重新估卡路里'}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
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
                {draft.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.previewUrl} alt="" className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-accent-soft/50 flex flex-col items-center justify-center gap-2 border-b border-border">
                    <PenLine className="h-7 w-7 text-accent" />
                    <span className="text-xs font-medium text-accent">手動入數</span>
                  </div>
                )}
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
                        ? '手動 · 自己填'
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
                      className="font-serif text-xl h-12 mb-2 border-0 shadow-none px-0 focus:ring-0"
                      placeholder="食物名稱（可改）"
                      aria-label="食物名稱"
                    />
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        disabled={reEstimating || !draft.name.trim()}
                        onClick={() => void reEstimateFromName()}
                      >
                        {reEstimating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {reEstimating ? '重估緊…' : '按名重新估'}
                      </Button>
                      <span className="text-[11px] text-muted">
                        改錯名（例如刪走蛋治）之後撳呢掣 · 唔扣影相 AI 額
                      </span>
                    </div>
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
                          className="rounded-2xl border border-border/90 bg-surface-muted px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent/35 transition"
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
                    {draft.aiSnapshot && liveMacros && (
                      (() => {
                        const snap = draft.aiSnapshot!
                        const portion = draft.portion || 1
                        const aiLive = {
                          kcal: Math.round(snap.kcal * portion),
                          protein: Math.round(snap.protein * portion * 10) / 10,
                          carbs: Math.round(snap.carbs * portion * 10) / 10,
                          fat: Math.round(snap.fat * portion * 10) / 10,
                        }
                        const changed =
                          Math.abs(aiLive.kcal - liveMacros.kcal) >= 1 ||
                          Math.abs(aiLive.protein - liveMacros.protein) >= 0.5 ||
                          Math.abs(aiLive.carbs - liveMacros.carbs) >= 0.5 ||
                          Math.abs(aiLive.fat - liveMacros.fat) >= 0.5
                        if (!changed) {
                          return (
                            <div className="mb-4 rounded-2xl border border-border/80 bg-surface-muted px-3.5 py-3 text-[11px] text-muted leading-relaxed">
                              而家同 AI 估一樣。改數字之後會顯示「你改完 vs AI 估」。
                            </div>
                          )
                        }
                        return (
                          <div className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft/40 px-3.5 py-3">
                            <div className="text-[11px] font-semibold text-accent mb-2">你改完 vs AI 估</div>
                            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                              {(
                                [
                                  { k: 'kcal' as const, label: 'kcal' },
                                  { k: 'protein' as const, label: '蛋白' },
                                  { k: 'carbs' as const, label: '碳水' },
                                  { k: 'fat' as const, label: '脂肪' },
                                ]
                              ).map((item) => {
                                const yours = liveMacros[item.k]
                                const ai = aiLive[item.k]
                                const delta = Math.round((yours - ai) * 10) / 10
                                return (
                                  <div key={item.k} className="rounded-xl border border-border/70 bg-surface px-1.5 py-2">
                                    <div className="text-muted mb-0.5">{item.label}</div>
                                    <div className="font-semibold tabular-nums text-foreground text-[12px]">{yours}</div>
                                    <div className="text-muted tabular-nums mt-0.5">AI {ai}</div>
                                    <div className={delta === 0 ? 'text-muted' : delta > 0 ? 'text-accent font-semibold' : 'text-amber-700 font-semibold'}>
                                      {delta > 0 ? `+${delta}` : `${delta}`}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <button
                              type="button"
                              className="mt-2 text-[11px] font-semibold text-accent touch-manipulation"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  baseMacros: { ...draft.aiSnapshot! },
                                  estimated: true,
                                })
                              }
                            >
                              還原 AI 估
                            </button>
                          </div>
                        )
                      })()
                    )}

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
                        ? 'AI 額用晒或者暫時唔得都冇問題——自己改完數字再入日記就得。數字仍係你負責，唔係營養師建議。'
                        : 'AI／示範估算可有誤差，唔係營養師或醫療飲食建議。登入後入雲端歷史；過敏或疾病請咨詢專業人士。'}{' '}
                      <a href="/disclaimer" className="text-accent font-medium hover:underline">
                        免責
                      </a>
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
            className="fixed above-nav-gap left-1/2 z-[60] -translate-x-1/2 max-w-[min(92vw,420px)] rounded-2xl border border-border bg-foreground text-background px-4 py-3 text-xs shadow-hover flex items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={springSoft}
            role="status"
            aria-live="polite"
          >
            <span className="flex-1 leading-relaxed">{toast}</span>
            {undoMeal && toast.includes('可還原') ? (
              <button
                type="button"
                onClick={undoRemoveMeal}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-background/15 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-background/25 touch-manipulation"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                還原
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
          <SyncToast message={syncToast} onDismiss={() => setSyncToast(null)} />
    </AppShell>
  )
}
