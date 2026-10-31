/** Rule-based weekly workout plan generator — HK Cantonese, practical v1. */

export type PlanGoal = 'hypertrophy' | 'fatloss' | 'conditioning' | 'general'
export type PlanExperience = 'beginner' | 'intermediate' | 'advanced'
export type PlanEquipment = 'gym' | 'dumbbell' | 'bodyweight'

export type PlanInputs = {
  goal: PlanGoal
  experience: PlanExperience
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  sessionMinutes: 30 | 45 | 60 | 75
  equipment: PlanEquipment
  notes?: string
}

export type PlanExercise = {
  exerciseId: string
  nameZh: string
  sets: number
  reps: string // e.g. "8–12"
  restSec: number
}

export type PlanDay = {
  dayIndex: number // 0 = 星期一
  nameZh: string
  focus: string
  exercises: PlanExercise[]
}

export type GeneratedPlan = {
  title: string
  split: string
  summary: string
  days: PlanDay[]
}

const DAY_NAMES = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

type Ex = { id: string; nameZh: string; gym: boolean; db: boolean; bw: boolean }

const POOL: Record<string, Ex[]> = {
  push: [
    { id: 'bench', nameZh: '卧推', gym: true, db: true, bw: false },
    { id: 'ohp', nameZh: '肩推', gym: true, db: true, bw: false },
    { id: 'fly', nameZh: '飛鳥', gym: true, db: true, bw: false },
    { id: 'lateral', nameZh: '側平舉', gym: true, db: true, bw: false },
    { id: 'tricep', nameZh: '三頭下壓', gym: true, db: true, bw: false },
  ],
  pull: [
    { id: 'row', nameZh: '划船', gym: true, db: true, bw: false },
    { id: 'latpulldown', nameZh: '高拉', gym: true, db: false, bw: false },
    { id: 'pullup', nameZh: '引體上升', gym: true, db: false, bw: true },
    { id: 'deadlift', nameZh: '硬拉', gym: true, db: true, bw: false },
    { id: 'curl', nameZh: '二頭彎舉', gym: true, db: true, bw: false },
  ],
  legs: [
    { id: 'squat', nameZh: '深蹲', gym: true, db: true, bw: true },
    { id: 'legpress', nameZh: '腿舉', gym: true, db: false, bw: false },
    { id: 'rdl', nameZh: '羅馬尼亞硬拉', gym: true, db: true, bw: false },
    { id: 'lunges', nameZh: '弓步蹲', gym: true, db: true, bw: true },
    { id: 'hipthrust', nameZh: '臀推', gym: true, db: true, bw: true },
    { id: 'calf', nameZh: '提踵', gym: true, db: true, bw: true },
  ],
  core: [
    { id: 'plank', nameZh: '平板支撐', gym: true, db: true, bw: true },
    { id: 'crunch', nameZh: '捲腹', gym: true, db: true, bw: true },
  ],
  full: [
    { id: 'squat', nameZh: '深蹲', gym: true, db: true, bw: true },
    { id: 'bench', nameZh: '卧推', gym: true, db: true, bw: false },
    { id: 'row', nameZh: '划船', gym: true, db: true, bw: false },
    { id: 'ohp', nameZh: '肩推', gym: true, db: true, bw: false },
    { id: 'lunges', nameZh: '弓步蹲', gym: true, db: true, bw: true },
    { id: 'plank', nameZh: '平板支撐', gym: true, db: true, bw: true },
  ],
}

function filterEquip(list: Ex[], eq: PlanEquipment) {
  return list.filter((e) => {
    if (eq === 'gym') return e.gym
    if (eq === 'dumbbell') return e.db
    return e.bw
  })
}

function setsReps(goal: PlanGoal, exp: PlanExperience, minutes: number) {
  const baseSets = minutes <= 30 ? 3 : minutes <= 45 ? 3 : minutes <= 60 ? 4 : 4
  const sets = exp === 'beginner' ? Math.min(3, baseSets) : baseSets
  if (goal === 'hypertrophy') return { sets, reps: '8–12', restSec: 90 }
  if (goal === 'fatloss') return { sets: Math.max(3, sets - 0), reps: '10–15', restSec: 60 }
  if (goal === 'conditioning') return { sets: 3, reps: '12–20', restSec: 45 }
  return { sets: exp === 'beginner' ? 3 : sets, reps: '8–12', restSec: 75 }
}

function pick(list: Ex[], n: number): Ex[] {
  return list.slice(0, Math.max(1, Math.min(n, list.length)))
}

function countExercises(minutes: number, exp: PlanExperience) {
  if (minutes <= 30) return exp === 'beginner' ? 4 : 5
  if (minutes <= 45) return 5
  if (minutes <= 60) return 6
  return 7
}

function splitForDays(days: number): { name: string; foci: string[] } {
  if (days <= 2) return { name: '全身', foci: ['全身', '全身'] }
  if (days === 3) return { name: '全身 ×3', foci: ['全身', '全身', '全身'] }
  if (days === 4) return { name: '上下身', foci: ['上身', '下身', '上身', '下身'] }
  if (days === 5) return { name: '推拉腿＋上＋下', foci: ['推', '拉', '腿', '上身', '下身'] }
  return { name: '推拉腿 ×2', foci: ['推', '拉', '腿', '推', '拉', '腿'] }
}

function focusPool(focus: string): Ex[] {
  if (focus === '推') return [...POOL.push, ...POOL.core]
  if (focus === '拉') return [...POOL.pull, ...POOL.core]
  if (focus === '腿' || focus === '下身') return [...POOL.legs, ...POOL.core]
  if (focus === '上身') return [...POOL.push.slice(0, 3), ...POOL.pull.slice(0, 3), ...POOL.core]
  return POOL.full
}

const GOAL_LABEL: Record<PlanGoal, string> = {
  hypertrophy: '增肌',
  fatloss: '減脂',
  conditioning: '體能',
  general: '一般健康',
}

const EXP_LABEL: Record<PlanExperience, string> = {
  beginner: '新手',
  intermediate: '中階',
  advanced: '進階',
}

const EQ_LABEL: Record<PlanEquipment, string> = {
  gym: '健身房',
  dumbbell: '宿舍啞鈴',
  bodyweight: '徒手',
}

export function generatePlan(inputs: PlanInputs): GeneratedPlan {
  const { name: splitName, foci } = splitForDays(inputs.daysPerWeek)
  const nEx = countExercises(inputs.sessionMinutes, inputs.experience)
  const sr = setsReps(inputs.goal, inputs.experience, inputs.sessionMinutes)

  // Spread training days across the week (prefer weekdays first)
  const slots =
    inputs.daysPerWeek === 2
      ? [0, 3]
      : inputs.daysPerWeek === 3
        ? [0, 2, 4]
        : inputs.daysPerWeek === 4
          ? [0, 1, 3, 4]
          : inputs.daysPerWeek === 5
            ? [0, 1, 2, 3, 4]
            : [0, 1, 2, 3, 4, 5]

  const days: PlanDay[] = foci.map((focus, i) => {
    const pool = filterEquip(focusPool(focus), inputs.equipment)
    // Prefer variety: rotate start index
    const rotated = [...pool.slice(i % pool.length), ...pool.slice(0, i % pool.length)]
    const chosen = pick(rotated.length ? rotated : filterEquip(POOL.full, inputs.equipment), nEx)
    const dayIndex = slots[i] ?? i
    return {
      dayIndex,
      nameZh: DAY_NAMES[dayIndex],
      focus,
      exercises: chosen.map((e) => ({
        exerciseId: e.id,
        nameZh: e.nameZh,
        sets: sr.sets,
        reps: e.id === 'plank' ? '30–60秒' : sr.reps,
        restSec: sr.restSec,
      })),
    }
  })

  const title = `${GOAL_LABEL[inputs.goal]} · ${splitName} · 一週${inputs.daysPerWeek}練`
  const summary = `${EXP_LABEL[inputs.experience]}／${EQ_LABEL[inputs.equipment]}／每次約 ${inputs.sessionMinutes} 分鐘。${
    inputs.notes ? `備註：${inputs.notes.slice(0, 80)}` : '跟住課表一掣就可以開波。'
  }`

  return { title, split: splitName, summary, days }
}

export const GOAL_OPTIONS: { id: PlanGoal; label: string; hint: string }[] = [
  { id: 'hypertrophy', label: '增肌', hint: '組數足、8–12 下' },
  { id: 'fatloss', label: '減脂', hint: '少休息、多反復' },
  { id: 'conditioning', label: '體能', hint: '輕快節奏' },
  { id: 'general', label: '一般健康', hint: '均衡好堅持' },
]

export const EXP_OPTIONS: { id: PlanExperience; label: string }[] = [
  { id: 'beginner', label: '新手' },
  { id: 'intermediate', label: '中階' },
  { id: 'advanced', label: '進階' },
]

export const EQ_OPTIONS: { id: PlanEquipment; label: string; hint: string }[] = [
  { id: 'gym', label: '健身房', hint: '器械齊' },
  { id: 'dumbbell', label: '宿舍啞鈴', hint: '有限空間' },
  { id: 'bodyweight', label: '徒手', hint: '唔使器械' },
]
