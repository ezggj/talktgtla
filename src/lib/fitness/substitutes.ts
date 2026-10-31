/** 冇某器械 → 同部位替代動作（純本地規則）. */

import { EXERCISES, exerciseById, type Equipment, type ExerciseGuide } from '@/lib/exercises/library'

/** Explicit pairs when muscle-match alone is too vague. */
const MANUAL: Record<string, string[]> = {
  bench: ['dumbbell-press', 'chest-press-machine', 'pushup', 'fly'],
  'incline-bench': ['dumbbell-press', 'fly', 'pushup'],
  squat: ['goblet-squat', 'legpress', 'lunges', 'bulgarian-split'],
  'front-squat': ['goblet-squat', 'legpress'],
  deadlift: ['rdl', 'seated-row', 'dumbbell-row'],
  'sumo-deadlift': ['rdl', 'legpress'],
  ohp: ['db-shoulder-press', 'lateral'],
  row: ['seated-row', 'dumbbell-row', 'latpulldown'],
  pullup: ['latpulldown', 'seated-row', 'chinup'],
  chinup: ['latpulldown', 'pullup'],
  rdl: ['leg-curl', 'hipthrust', 'lunges'],
  'bulgarian-split': ['lunges', 'legpress', 'goblet-squat'],
  curl: ['hammer-curl'],
  tricep: ['overhead-tricep', 'skullcrusher', 'dip'],
  lateral: ['front-raise', 'db-shoulder-press'],
  fly: ['dumbbell-press', 'pushup'],
}

function normalizeMuscle(m: string) {
  if (m.includes('臀') || m.includes('腿')) return '腿'
  return m
}

export type SubstituteSuggestion = {
  exercise: ExerciseGuide
  reason: string
}

/**
 * Suggest alternatives when the preferred kit is missing.
 * If `haveEquipment` is set, prefer those; otherwise any other equipment on same muscle.
 */
export function suggestSubstitutes(
  exerciseId: string,
  opts?: { avoidEquipment?: Equipment; preferEquipment?: Equipment | null; limit?: number }
): SubstituteSuggestion[] {
  const base = exerciseById(exerciseId)
  if (!base) return []
  const limit = opts?.limit ?? 3
  const avoid = opts?.avoidEquipment || base.equipment
  const prefer = opts?.preferEquipment || null

  const seen = new Set<string>([exerciseId])
  const out: SubstituteSuggestion[] = []

  const push = (id: string, reason: string) => {
    if (seen.has(id) || out.length >= limit) return
    const ex = exerciseById(id)
    if (!ex) return
    if (avoid && ex.equipment === avoid && prefer !== avoid) return
    seen.add(id)
    out.push({ exercise: ex, reason })
  }

  for (const id of MANUAL[exerciseId] || []) {
    const ex = exerciseById(id)
    if (!ex) continue
    const reason =
      ex.equipment !== base.equipment
        ? `冇${base.equipment}？改用${ex.equipment}`
        : '同部位類似刺激'
    push(id, reason)
  }

  const muscle = normalizeMuscle(base.muscle)
  const pool = EXERCISES.filter(
    (e) => e.id !== exerciseId && normalizeMuscle(e.muscle) === muscle
  )

  const ranked = [...pool].sort((a, b) => {
    const score = (e: ExerciseGuide) => {
      let s = 0
      if (prefer && e.equipment === prefer) s += 5
      if (e.equipment !== avoid) s += 2
      if (e.equipment === '機械' || e.equipment === '啞鈴') s += 1
      return s
    }
    return score(b) - score(a)
  })

  for (const e of ranked) {
    if (out.length >= limit) break
    push(
      e.id,
      e.equipment !== base.equipment
        ? `冇${base.equipment}可改${e.equipment} · ${e.nameZh}`
        : `同練${muscle} · ${e.nameZh}`
    )
  }

  return out.slice(0, limit)
}

export function equipmentLabel(eq: Equipment) {
  return eq
}
