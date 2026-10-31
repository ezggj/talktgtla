import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FitnessGoals,
  MealEntry,
  MealMacros,
  WorkoutSession,
  WorkoutSet,
} from './storage'

export type ProfileRow = {
  id: string
  display_name: string | null
  protein_goal: number
  calorie_goal: number
}

export type MealPeriodBucket = {
  bucket_start: string
  meals_count: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export type PeriodKind = 'day' | 'week' | 'month'

function num(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/* ───────── Profile / goals ───────── */

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, protein_goal, calorie_goal')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertGoals(
  supabase: SupabaseClient,
  userId: string,
  goals: FitnessGoals,
  displayName?: string | null
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      protein_goal: goals.proteinG,
      calorie_goal: goals.kcal,
      display_name: displayName ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

/* ───────── Workouts ───────── */

type WorkoutRow = {
  id: string
  started_at: string
  ended_at: string | null
  notes: string | null
  template_id: string | null
  analysis: unknown | null
  workout_sets: Array<{
    id: string
    exercise_id: string | null
    exercise_name: string
    set_index: number
    weight_kg: number | string
    reps: number
    duration_sec: number | null
    rest_sec: number | null
    completed_at: string
  }> | null
}

export function mapWorkoutRow(row: WorkoutRow): WorkoutSession {
  const sets: WorkoutSet[] = (row.workout_sets || [])
    .slice()
    .sort((a, b) => a.set_index - b.set_index || a.completed_at.localeCompare(b.completed_at))
    .map((s) => ({
      id: s.id,
      exerciseId: s.exercise_id || s.exercise_name,
      exerciseName: s.exercise_name,
      setIndex: s.set_index,
      weightKg: num(s.weight_kg),
      reps: s.reps,
      restSec: s.rest_sec ?? undefined,
      completedAt: s.completed_at,
    }))
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    note: row.notes ?? undefined,
    templateId: row.template_id ?? undefined,
    analysis: (row.analysis as WorkoutSession['analysis']) || undefined,
    sets,
  }
}

export async function fetchWorkouts(
  supabase: SupabaseClient,
  limit = 60
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `id, started_at, ended_at, notes, template_id, analysis,
       workout_sets (id, exercise_id, exercise_name, set_index, weight_kg, reps, duration_sec, rest_sec, completed_at)`
    )
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as WorkoutRow[] | null)?.map(mapWorkoutRow) ?? []
}

export async function persistFinishedWorkout(
  supabase: SupabaseClient,
  userId: string,
  session: WorkoutSession
): Promise<void> {
  const { error: wErr } = await supabase.from('workouts').upsert(
    {
      id: session.id,
      user_id: userId,
      started_at: session.startedAt,
      ended_at: session.endedAt ?? new Date().toISOString(),
      notes: session.note ?? null,
      template_id: session.templateId ?? null,
      analysis: session.analysis ?? null,
    },
    { onConflict: 'id' }
  )
  if (wErr) throw wErr

  // Replace sets for this workout (simple + correct for finished sessions)
  await supabase.from('workout_sets').delete().eq('workout_id', session.id)

  if (session.sets.length === 0) return

  const rows = session.sets.map((s) => ({
    id: s.id,
    workout_id: session.id,
    user_id: userId,
    exercise_id: s.exerciseId,
    exercise_name: s.exerciseName,
    set_index: s.setIndex,
    weight_kg: s.weightKg,
    reps: s.reps,
    rest_sec: s.restSec ?? null,
    completed_at: s.completedAt,
  }))
  const { error: sErr } = await supabase.from('workout_sets').insert(rows)
  if (sErr) throw sErr
}

/** One-shot migrate local finished sessions → cloud (skip ids already remote). */
export async function migrateLocalWorkouts(
  supabase: SupabaseClient,
  userId: string,
  local: WorkoutSession[]
) {
  const finished = local.filter((s) => s.endedAt)
  if (finished.length === 0) return 0
  const remote = await fetchWorkouts(supabase, 200)
  const remoteIds = new Set(remote.map((r) => r.id))
  let n = 0
  for (const s of finished) {
    if (remoteIds.has(s.id)) continue
    await persistFinishedWorkout(supabase, userId, s)
    n++
  }
  return n
}

/* ───────── Meals ───────── */

type MealRow = {
  id: string
  eaten_at: string
  image_path: string | null
  label: string
  kcal: number | string
  protein_g: number | string
  carbs_g: number | string
  fat_g: number | string
  fiber_g: number | string | null
  source: 'mock' | 'ai' | 'manual'
  portion_scale: number | string
  note: string | null
}

export function mapMealRow(row: MealRow, signedUrl?: string | null): MealEntry {
  const macros: MealMacros = {
    kcal: Math.round(num(row.kcal)),
    protein: Math.round(num(row.protein_g)),
    carbs: Math.round(num(row.carbs_g)),
    fat: Math.round(num(row.fat_g)),
    fiber: row.fiber_g == null ? undefined : Math.round(num(row.fiber_g)),
  }
  return {
    id: row.id,
    createdAt: row.eaten_at,
    name: row.label,
    imageDataUrl: signedUrl || undefined,
    macros,
    portion: num(row.portion_scale, 1),
    note: row.note ?? undefined,
    estimated: row.source !== 'manual',
    imagePath: row.image_path ?? undefined,
    source: row.source,
  }
}

export async function fetchMeals(
  supabase: SupabaseClient,
  opts?: { from?: string; to?: string; limit?: number }
): Promise<MealEntry[]> {
  let q = supabase
    .from('meals')
    .select(
      'id, eaten_at, image_path, label, kcal, protein_g, carbs_g, fat_g, fiber_g, source, portion_scale, note'
    )
    .order('eaten_at', { ascending: false })
    .limit(opts?.limit ?? 500)

  if (opts?.from) q = q.gte('eaten_at', opts.from)
  if (opts?.to) q = q.lt('eaten_at', opts.to)

  const { data, error } = await q
  if (error) throw error

  const rows = (data as MealRow[] | null) ?? []
  // Sign a few recent photos (lazy; avoid N+1 storm)
  const withPaths = rows.filter((r) => r.image_path).slice(0, 40)
  const urlMap = new Map<string, string>()
  await Promise.all(
    withPaths.map(async (r) => {
      if (!r.image_path) return
      const { data: signed } = await supabase.storage
        .from('meal-photos')
        .createSignedUrl(r.image_path, 60 * 60 * 6)
      if (signed?.signedUrl) urlMap.set(r.id, signed.signedUrl)
    })
  )

  return rows.map((r) => mapMealRow(r, urlMap.get(r.id)))
}

export async function upsertMeal(
  supabase: SupabaseClient,
  userId: string,
  meal: MealEntry,
  file?: File | null
): Promise<MealEntry> {
  let imagePath = meal.imagePath ?? null

  if (file) {
    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg'
    imagePath = `${userId}/${meal.id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('meal-photos')
      .upload(imagePath, file, { upsert: true, contentType: file.type || 'image/jpeg' })
    if (upErr) throw upErr
  }

  const source =
    meal.source ??
    (meal.estimated ? ('mock' as const) : ('manual' as const))

  const row = {
    id: meal.id,
    user_id: userId,
    eaten_at: meal.createdAt,
    image_path: imagePath,
    label: meal.name,
    kcal: meal.macros.kcal,
    protein_g: meal.macros.protein,
    carbs_g: meal.macros.carbs,
    fat_g: meal.macros.fat,
    fiber_g: meal.macros.fiber ?? null,
    source,
    portion_scale: meal.portion,
    note: meal.note ?? null,
  }

  const { error } = await supabase.from('meals').upsert(row, { onConflict: 'id' })
  if (error) throw error

  let signed: string | undefined
  if (imagePath) {
    const { data } = await supabase.storage
      .from('meal-photos')
      .createSignedUrl(imagePath, 60 * 60 * 6)
    signed = data?.signedUrl
  }

  return {
    ...meal,
    imagePath: imagePath ?? undefined,
    imageDataUrl: signed || meal.imageDataUrl,
    source,
  }
}

export async function deleteMealCloud(supabase: SupabaseClient, meal: MealEntry) {
  if (meal.imagePath) {
    await supabase.storage.from('meal-photos').remove([meal.imagePath])
  }
  const { error } = await supabase.from('meals').delete().eq('id', meal.id)
  if (error) throw error
}

export async function migrateLocalMeals(
  supabase: SupabaseClient,
  userId: string,
  local: MealEntry[]
) {
  if (local.length === 0) return 0
  const remote = await fetchMeals(supabase, { limit: 500 })
  const remoteIds = new Set(remote.map((m) => m.id))
  let n = 0
  for (const m of local) {
    if (remoteIds.has(m.id)) continue
    // Skip blob: object URLs — can't re-upload without file
    const { imageDataUrl: _drop, ...rest } = m
    await upsertMeal(supabase, userId, { ...rest, imageDataUrl: undefined })
    n++
  }
  return n
}

/** SQL rollup: day / week / month buckets (HK timezone). */
export async function fetchMealPeriodTotals(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
  bucket: PeriodKind
): Promise<MealPeriodBucket[]> {
  const { data, error } = await supabase.rpc('meal_period_totals', {
    p_from: fromIso,
    p_to: toIso,
    p_bucket: bucket,
  })
  if (error) throw error
  return ((data as MealPeriodBucket[] | null) ?? []).map((r) => ({
    bucket_start: String(r.bucket_start).slice(0, 10),
    meals_count: num(r.meals_count),
    kcal: num(r.kcal),
    protein_g: num(r.protein_g),
    carbs_g: num(r.carbs_g),
    fat_g: num(r.fat_g),
    fiber_g: num(r.fiber_g),
  }))
}

/** Range helpers in Asia/Hong_Kong calendar sense (approximate via local TZ of device). */
export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfWeekMonday(d = new Date()) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 Sun
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export function rangeForPeriod(
  kind: PeriodKind,
  anchor = new Date()
): { from: Date; to: Date; label: string } {
  if (kind === 'day') {
    const from = startOfDay(anchor)
    return { from, to: addDays(from, 1), label: from.toLocaleDateString('zh-HK') }
  }
  if (kind === 'week') {
    const from = startOfWeekMonday(anchor)
    return {
      from,
      to: addDays(from, 7),
      label: `${from.toLocaleDateString('zh-HK')} – ${addDays(from, 6).toLocaleDateString('zh-HK')}`,
    }
  }
  const from = startOfMonth(anchor)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 1)
  return {
    from,
    to,
    label: `${from.getFullYear()}年${from.getMonth() + 1}月`,
  }
}
