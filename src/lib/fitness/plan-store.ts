/** Active + saved workout plans — local always; cloud when logged in. */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { GeneratedPlan, PlanInputs } from './plan-generator'
import { newId } from './storage'

const ACTIVE_KEY = 'talktgtla-active-plan-v1'
const SAVED_KEY = 'talktgtla-saved-plans-v1'

export type StoredPlanMeta = {
  id: string
  title: string
  plan: GeneratedPlan
  inputs?: Partial<PlanInputs> & { presetId?: string; custom?: boolean }
  source: 'generator' | 'preset' | 'custom' | 'cloud'
  updatedAt: string
  cloudId?: string
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function loadActivePlan(): StoredPlanMeta | null {
  return readJson<StoredPlanMeta | null>(ACTIVE_KEY, null)
}

export function saveActivePlan(meta: StoredPlanMeta | null) {
  if (!meta) {
    try {
      localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  writeJson(ACTIVE_KEY, meta)
}

export function loadSavedPlans(): StoredPlanMeta[] {
  return readJson<StoredPlanMeta[]>(SAVED_KEY, [])
}

export function saveSavedPlans(list: StoredPlanMeta[]) {
  writeJson(SAVED_KEY, list.slice(0, 20))
}

export function upsertSavedPlan(meta: StoredPlanMeta) {
  const list = loadSavedPlans().filter((p) => p.id !== meta.id)
  list.unshift(meta)
  saveSavedPlans(list)
}

export function removeSavedPlan(id: string) {
  saveSavedPlans(loadSavedPlans().filter((p) => p.id !== id))
}

/** Set as the plan you're following this week; also keeps a copy in saved list. */
export function setFollowingPlan(
  plan: GeneratedPlan,
  opts: {
    source: StoredPlanMeta['source']
    inputs?: StoredPlanMeta['inputs']
    id?: string
    cloudId?: string
  }
): StoredPlanMeta {
  const meta: StoredPlanMeta = {
    id: opts.id || newId(),
    title: plan.title,
    plan,
    inputs: opts.inputs,
    source: opts.source,
    updatedAt: new Date().toISOString(),
    cloudId: opts.cloudId,
  }
  saveActivePlan(meta)
  upsertSavedPlan(meta)
  return meta
}

/** Persist to Supabase workout_plans; returns cloud row id. */
export async function persistPlanToCloud(
  supabase: SupabaseClient,
  userId: string,
  plan: GeneratedPlan,
  inputs: Record<string, unknown> = {}
): Promise<string> {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      inputs,
      plan,
      title: plan.title,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** If no local active plan, hydrate from latest cloud plan. */
export async function hydrateActivePlanFromCloud(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredPlanMeta | null> {
  const existing = loadActivePlan()
  if (existing?.plan?.days?.length) return existing

  const { data, error } = await supabase
    .from('workout_plans')
    .select('id, plan, inputs, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data?.plan) return existing

  const plan = data.plan as GeneratedPlan
  if (!plan?.days?.length) return existing
  const meta = setFollowingPlan(plan, {
    source: 'cloud',
    inputs: (data.inputs as StoredPlanMeta['inputs']) || {},
    cloudId: data.id,
  })
  return meta
}

/** Monday = 0 … Sunday = 6 */
export function mondayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7
}

/** Prefer today's scheduled day; else next upcoming this week; else first. */
export function pickTodayOrNextDay(plan: GeneratedPlan, now = new Date()) {
  const idx = mondayIndex(now)
  const today = plan.days.find((d) => d.dayIndex === idx)
  if (today) return { day: today, isToday: true as const }
  const upcoming = [...plan.days]
    .filter((d) => d.dayIndex > idx)
    .sort((a, b) => a.dayIndex - b.dayIndex)[0]
  if (upcoming) return { day: upcoming, isToday: false as const }
  const first = [...plan.days].sort((a, b) => a.dayIndex - b.dayIndex)[0]
  return first ? { day: first, isToday: false as const } : null
}

export function planStartHref(planTitle: string, exerciseIds: string[]) {
  const qs = exerciseIds.join(',')
  return `/train?plan=${encodeURIComponent(planTitle)}&exercises=${encodeURIComponent(qs)}`
}
