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
} from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { PageTransition } from '@/components/motion/page-transition'
import { Stagger, StaggerItem } from '@/components/motion/stagger'
import { springSoft, springSnappy } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Card, CardDesc, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressBar, ProgressRing } from '@/components/ui/progress'
import { LoginPromptBanner } from '@/components/auth/login-card'
import { useUser } from '@/lib/auth/use-user'
import { createClient } from '@/lib/supabase/client'
import {
  HK_DISH_ESTIMATES,
  mockEstimateFromFile,
  scaleMacros,
} from '@/lib/fitness/meals-demo'
import { compressMealImage } from '@/lib/fitness/compress-image'
import {
  type MealEntry,
  type MealMacros,
  isSameDay,
  loadGoals,
  loadMeals,
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
  fetchMeals,
  migrateLocalMeals,
  rangeForPeriod,
  startOfDay,
  upsertMeal,
} from '@/lib/fitness/cloud'
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
  source: 'ai' | 'mock'
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

  // Cloud hydrate + migrate when logged in
  useEffect(() => {
    if (!authReady || !user) return
    let cancelled = false
    ;(async () => {
      setSyncing(true)
      try {
        const supabase = createClient()
        await migrateLocalMeals(supabase, user.id, loadMeals())
        // Pull generous history (enough for monthly rollups client-side + RPC)
        const remote = await fetchMeals(supabase, { limit: 800 })
        if (cancelled) return
        setMeals(remote)
        saveMeals(remote)
        setCloudNote('已同步雲端飲食歷史')
      } catch (e) {
        if (!cancelled) setCloudNote(e instanceof Error ? e.message : '同步失敗')
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
      name: 'AI 認緊碟餸…',
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

        const res = await fetch('/api/eat/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        }

        if (!res.ok || !data.macros || !data.name) {
          throw new Error(data.error || 'AI 估算失敗')
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
                note: data.note,
              }
            : null
        )
      } catch (e) {
        const est = mockEstimateFromFile(file.name || 'meal.jpg')
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: 'ready',
                name: est.name,
                baseMacros: est.macros,
                estimated: true,
                source: 'mock',
                note: 'AI 暫時唔得，用示範估算；可人手改',
              }
            : null
        )
        showToast(
          e instanceof Error
            ? `AI 估唔到：${e.message} · 已改用示範估算`
            : 'AI 估唔到 · 已改用示範估算'
        )
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
      setCloudNote(e instanceof Error ? e.message : '雲端儲存失敗')
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
      source: draft.source,
      note: draft.note,
    }
    const next = [entry, ...meals]
    void persistList(next, entry, draft.file)
    setDraft(null)
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
    void persistList([entry, ...meals], entry)
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
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <div className="h-10 w-48 rounded-2xl bg-border/70 skeleton-pulse" />
          <div className="h-28 rounded-[20px] bg-border/50 skeleton-pulse" />
          <div className="h-40 rounded-[20px] bg-border/40 skeleton-pulse" />
        </div>
      </AppShell>
    )
  }

  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const monthStartWeekday = new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay()
  const heatMax = Math.max(1, ...monthHeat.values())

  return (
    <AppShell>
      <PageTransition className="max-w-2xl mx-auto">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted mb-2">飲食</p>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">影低呢餐</h1>
          <p className="mt-2 text-sm text-muted max-w-md">
            卡路里、蛋白、碳水、脂肪一齊估。登入之後歷史永久保存，隨時翻睇日／週／月總計。
          </p>
        </header>

        {!user && (
          <div className="mb-5">
            <LoginPromptBanner />
          </div>
        )}

        {user && (
          <div className="mb-4 flex items-center gap-2 text-[11px] text-muted">
            <Cloud className={cn('h-3.5 w-3.5 text-accent', syncing && 'animate-pulse')} />
            {syncing ? '同步緊…' : cloudNote || '雲端飲食已開啟'}
          </div>
        )}

        {/* Period switcher */}
        <div className="mb-4 flex gap-1.5 p-1 rounded-2xl bg-[#f0efee] border border-border">
          {(['day', 'week', 'month'] as PeriodKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              className={cn(
                'relative flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
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

        <Card className="mb-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              aria-label="上一段"
              onClick={() => shiftAnchor(-1)}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-black/[0.03]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="text-sm font-medium">{range.label}</div>
              <div className="text-[11px] text-muted">{periodMeals.length} 餐入帳</div>
            </div>
            <button
              type="button"
              aria-label="下一段"
              onClick={() => shiftAnchor(1)}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-black/[0.03]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                { label: 'kcal', v: Math.round(periodSum.kcal) },
                { label: '蛋白', v: `${Math.round(periodSum.protein)}g` },
                { label: '碳水', v: `${Math.round(periodSum.carbs)}g` },
                { label: '脂肪', v: `${Math.round(periodSum.fat)}g` },
              ] as const
            ).map((x) => (
              <div key={x.label} className="rounded-2xl bg-[#fafaf9] border border-border px-2 py-3">
                <div className="text-base font-semibold tabular-nums">{x.v}</div>
                <div className="text-[10px] text-muted">{x.label}</div>
              </div>
            ))}
          </div>
          {period === 'month' && buckets.length > 1 && (
            <p className="mt-3 text-[11px] text-muted text-center">
              本月按日拆開共 {buckets.length} 日有記錄 · SQL date_trunc 匯總
            </p>
          )}
        </Card>

        {/* Today rings — always show today's progress vs goals */}
        <Stagger className="grid grid-cols-2 gap-3 mb-6">
          <StaggerItem>
            <Card className="flex items-center gap-4 py-4">
              <ProgressRing
                value={todaySum.protein}
                max={goals.proteinG}
                label={`${todaySum.protein}g`}
                sublabel="蛋白"
                size={76}
              />
              <div>
                <div className="text-xs text-muted">今日蛋白</div>
                <div className="text-sm font-medium tabular-nums">{goals.proteinG} g</div>
                <ProgressBar className="mt-2 w-24" value={todaySum.protein} max={goals.proteinG} />
              </div>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="flex items-center gap-4 py-4">
              <ProgressRing
                value={todaySum.kcal}
                max={goals.kcal}
                label={`${todaySum.kcal}`}
                sublabel="kcal"
                size={76}
              />
              <div>
                <div className="text-xs text-muted">今日卡路里</div>
                <div className="text-sm font-medium tabular-nums">{goals.kcal}</div>
                <ProgressBar className="mt-2 w-24" value={todaySum.kcal} max={goals.kcal} />
              </div>
            </Card>
          </StaggerItem>
        </Stagger>

        {/* Month calendar heat (protein) */}
        {(period === 'month' || period === 'week') && (
          <Card className="mb-6">
            <CardTitle className="text-lg mb-1">飲食日曆</CardTitle>
            <CardDesc className="mb-4">色越深＝當日蛋白越多。撳日子跳去日計。</CardDesc>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
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
                    className="aspect-square rounded-xl text-[11px] font-medium tabular-nums border border-border/60 hover:scale-105 transition"
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
              相機優先 · AI 估 kcal／蛋白／碳水／脂肪。之後可拖份量；登入會永久入歷史。
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
            <h2 className="font-serif text-xl">香港常見</h2>
            <Badge tone="muted">示範估算</Badge>
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
            {period === 'day' ? '當日時間線' : period === 'week' ? '本週餐單' : '本月餐單'}
          </h2>
          <span className="text-xs text-muted">{periodMeals.length} 餐</span>
        </div>

        {periodMeals.length === 0 ? (
          <Card className="text-center py-14 mb-8">
            <Utensils className="h-8 w-8 text-muted mx-auto mb-3 opacity-45" />
            <CardTitle className="text-lg mb-1">呢段時間未有記錄</CardTitle>
            <CardDesc className="max-w-xs mx-auto">
              影低一餐或者撳「香港常見」。登入之後，成個星期嘅餐都可以留低，之後翻睇月計。
            </CardDesc>
          </Card>
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
                    ? 'AI 估算中…'
                    : draft.source === 'ai'
                      ? 'AI 估算 · 可改'
                      : '示範估算 · 可改'}
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
                    <p className="text-xs text-muted text-center pt-2">認緊碟餸…稍等</p>
                  </div>
                ) : (
                  <>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="font-serif text-xl h-12 mb-4 border-0 shadow-none px-0 focus:ring-0"
                    />
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {(
                        [
                          { k: 'kcal', label: 'kcal', v: liveMacros!.kcal },
                          { k: 'protein', label: '蛋白', v: liveMacros!.protein },
                          { k: 'carbs', label: '碳水', v: liveMacros!.carbs },
                          { k: 'fat', label: '脂肪', v: liveMacros!.fat },
                        ] as const
                      ).map((item) => (
                        <div
                          key={item.k}
                          className="rounded-2xl border border-border bg-[#fafaf9] px-2 py-3 text-center"
                        >
                          <div className="text-base font-semibold tabular-nums">{item.v}</div>
                          <div className="text-[10px] text-muted">{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <label className="block mb-5">
                      <div className="flex justify-between text-xs text-muted mb-2">
                        <span>份量</span>
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
                      估算僅供參考，唔係實驗室數字。登入後會入雲端歷史，之後可以睇月計。
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
