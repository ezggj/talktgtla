/** Local weekly schedule + custom day plans — works for guests too. */

import { TEMPLATES, type Template } from './exercises'
import type { GeneratedPlan, PlanInputs } from './plan-generator'
import { setFollowingPlan } from './plan-store'
import { startOfWeekMonday, addDays } from './cloud'
import {
  dayKeyFromIso,
  todayKey as localTodayKey,
  type WorkoutSession,
} from './storage'

const CUSTOM_KEY = 'talktgtla-custom-day-plans-v1'
const WEEKLY_KEY = 'talktgtla-weekly-schedule-v1'
const GENERATED_KEY = 'talktgtla-generated-plan-v1'

export type CustomDayPlan = {
  id: string
  name: string
  desc?: string
  exerciseIds: string[]
  badge?: string
  createdAt: string
}

/** One slot in a Mon–Sun weekly rotation (dayIndex 0 = 星期一). */
export type WeeklySlot = {
  dayIndex: number
  nameZh: string
  /** Built-in template id, or null = 休息 */
  templateId: string | null
  label: string
  hint?: string
}

/** Default 港式推拉腿週：新手腿日喺星期三，週末可休息。 */
export const DEFAULT_WEEKLY_PPL: WeeklySlot[] = [
  {
    dayIndex: 0,
    nameZh: '一',
    templateId: 'ppl-push',
    label: '推日',
    hint: '胸肩三頭',
  },
  {
    dayIndex: 1,
    nameZh: '二',
    templateId: 'ppl-pull',
    label: '拉日',
    hint: '背二頭',
  },
  {
    dayIndex: 2,
    nameZh: '三',
    templateId: 'newbie-leg-day',
    label: '新手腿日',
    hint: 'RDL／保加利亞有點做',
  },
  {
    dayIndex: 3,
    nameZh: '四',
    templateId: 'ppl-push',
    label: '推日',
    hint: '第二輪推',
  },
  {
    dayIndex: 4,
    nameZh: '五',
    templateId: 'ppl-pull',
    label: '拉日',
    hint: '第二輪拉',
  },
  {
    dayIndex: 5,
    nameZh: '六',
    templateId: 'ppl-legs',
    label: '腿日',
    hint: '深蹲＋RDL',
  },
  {
    dayIndex: 6,
    nameZh: '日',
    templateId: null,
    label: '休息',
    hint: '可選輕全身',
  },
]

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

export function loadCustomDayPlans(): CustomDayPlan[] {
  return readJson<CustomDayPlan[]>(CUSTOM_KEY, [])
}

export function saveCustomDayPlans(plans: CustomDayPlan[]) {
  writeJson(CUSTOM_KEY, plans)
}

export function upsertCustomDayPlan(
  plan: Omit<CustomDayPlan, 'id' | 'createdAt'> & { id?: string }
): CustomDayPlan {
  const list = loadCustomDayPlans()
  const id =
    plan.id ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `plan-${Date.now()}`)
  const row: CustomDayPlan = {
    id,
    name: plan.name,
    desc: plan.desc,
    exerciseIds: plan.exerciseIds,
    badge: plan.badge || '自訂',
    createdAt: new Date().toISOString(),
  }
  const next = [row, ...list.filter((p) => p.id !== id)].slice(0, 12)
  saveCustomDayPlans(next)
  return row
}

export function deleteCustomDayPlan(id: string) {
  saveCustomDayPlans(loadCustomDayPlans().filter((p) => p.id !== id))
}

export function saveTemplateAsCustom(t: Template): CustomDayPlan {
  return upsertCustomDayPlan({
    name: t.name,
    desc: t.desc,
    exerciseIds: [...t.exerciseIds],
    badge: '我嘅課表',
  })
}

export function loadWeeklySchedule(): WeeklySlot[] {
  const saved = readJson<WeeklySlot[] | null>(WEEKLY_KEY, null)
  if (saved && Array.isArray(saved) && saved.length === 7) return saved
  return DEFAULT_WEEKLY_PPL.map((s) => ({ ...s }))
}

export function saveWeeklySchedule(slots: WeeklySlot[]) {
  writeJson(WEEKLY_KEY, slots)
}

/** Swap training content between two calendar days (nameZh stays). */
export function moveWeeklySlot(slots: WeeklySlot[], dayIndex: number, dir: -1 | 1): WeeklySlot[] {
  const target = dayIndex + dir
  if (target < 0 || target > 6) return slots.map((s) => ({ ...s }))
  const next = slots.map((s) => ({ ...s }))
  const a = next.find((s) => s.dayIndex === dayIndex)
  const b = next.find((s) => s.dayIndex === target)
  if (!a || !b) return next
  const tmp = { templateId: a.templateId, label: a.label, hint: a.hint }
  a.templateId = b.templateId
  a.label = b.label
  a.hint = b.hint
  b.templateId = tmp.templateId
  b.label = tmp.label
  b.hint = tmp.hint
  return next
}


export function resetWeeklySchedule() {
  try {
    localStorage.removeItem(WEEKLY_KEY)
  } catch {
    /* ignore */
  }
}

/** Apply a built-in template id into today's weekday slot (Mon=0). */
export function setTodaySlotTemplate(templateId: string | null) {
  const slots = loadWeeklySchedule()
  const dow = new Date().getDay() // 0 Sun
  const dayIndex = dow === 0 ? 6 : dow - 1
  const t = templateId ? TEMPLATES.find((x) => x.id === templateId) : null
  const next = slots.map((s) =>
    s.dayIndex === dayIndex
      ? {
          ...s,
          templateId,
          label: t?.name || (templateId ? '自訂' : '休息'),
          hint: t?.desc?.slice(0, 24),
        }
      : s
  )
  saveWeeklySchedule(next)
  return next
}

export type TodayPlanHint = {
  slot: WeeklySlot
  template: Template | null
  /** Already finished a matching session today */
  doneToday: boolean
  /** Other slots this week that are done */
  weekDone: number
  weekTotal: number
  nextLabel: string
}

function slotDoneThisWeek(
  slot: WeeklySlot,
  sessions: WorkoutSession[],
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (!slot.templateId) return false
  const slotDate = localTodayKey(addDays(weekStart, slot.dayIndex))
  return sessions.some((s) => {
    if (!s.endedAt) return false
    const t = new Date(s.startedAt).getTime()
    if (t < weekStart.getTime() || t >= weekEnd.getTime()) return false
    if (s.templateId === slot.templateId) return true
    // Same calendar day + decent exercise overlap with template
    if (dayKeyFromIso(s.startedAt) !== slotDate) return false
    const tpl = TEMPLATES.find((x) => x.id === slot.templateId)
    if (!tpl) return false
    const planned = new Set(tpl.exerciseIds)
    const logged = new Set(s.sets.map((x) => x.exerciseId))
    let hit = 0
    for (const id of planned) if (logged.has(id)) hit++
    return hit / planned.size >= 0.45
  })
}

export function getTodayPlanHint(
  sessions: WorkoutSession[],
  now = new Date()
): TodayPlanHint {
  const slots = loadWeeklySchedule()
  const dow = now.getDay()
  const dayIndex = dow === 0 ? 6 : dow - 1
  const slot = slots.find((s) => s.dayIndex === dayIndex) || slots[0]
  const template = slot.templateId
    ? TEMPLATES.find((t) => t.id === slot.templateId) || null
    : null
  const weekStart = startOfWeekMonday(now)
  const weekEnd = addDays(weekStart, 7)
  const todayStr = localTodayKey(now)
  const doneToday = sessions.some(
    (s) =>
      s.endedAt &&
      dayKeyFromIso(s.startedAt) === todayStr &&
      (slot.templateId
        ? s.templateId === slot.templateId ||
          (template
            ? (() => {
                const planned = new Set(template.exerciseIds)
                const logged = new Set(s.sets.map((x) => x.exerciseId))
                let hit = 0
                for (const id of planned) if (logged.has(id)) hit++
                return hit / planned.size >= 0.45
              })()
            : false)
        : true)
  )
  const trainSlots = slots.filter((s) => s.templateId)
  const weekDone = trainSlots.filter((s) =>
    slotDoneThisWeek(s, sessions, weekStart, weekEnd)
  ).length
  const nextIncomplete =
    slots.find((s) => s.dayIndex === dayIndex && s.templateId && !doneToday) ||
    slots.find(
      (s) =>
        s.templateId &&
        s.dayIndex > dayIndex &&
        !slotDoneThisWeek(s, sessions, weekStart, weekEnd)
    ) ||
    slots.find(
      (s) => s.templateId && !slotDoneThisWeek(s, sessions, weekStart, weekEnd)
    )
  const nextLabel = doneToday
    ? nextIncomplete && nextIncomplete.dayIndex !== dayIndex
      ? `下一個：星期${nextIncomplete.nameZh} · ${nextIncomplete.label}`
      : '今日搞掂——休息或者輕量都得'
    : slot.templateId
      ? `今日課表：${slot.label}${slot.hint ? `（${slot.hint}）` : ''}`
      : '今日休息日——想練可以開輕全身'

  return {
    slot,
    template,
    doneToday,
    weekDone,
    weekTotal: trainSlots.length,
    nextLabel,
  }
}

export function loadLocalGeneratedPlan(): {
  plan: GeneratedPlan
  inputs?: Partial<PlanInputs>
} | null {
  return readJson(GENERATED_KEY, null)
}

export function saveLocalGeneratedPlan(
  plan: GeneratedPlan,
  inputs?: Partial<PlanInputs>
) {
  writeJson(GENERATED_KEY, { plan, inputs })
  // Also mark as the plan you're following (progress + 一掣開今日)
  try {
    setFollowingPlan(plan, { source: 'generator', inputs })
  } catch {
    /* ignore */
  }
}

/** Built-in weekly rotations mapped to TEMPLATES (簡易週循環). */
export type SchedulePreset = {
  id: string
  name: string
  badge: string
  newbie?: boolean
  blurb: string
  slots: WeeklySlot[]
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'ppl-default',
    name: '推拉腿 ×2',
    badge: 'PPL',
    blurb: '一至六推拉腿輪兩輪，日休息',
    slots: DEFAULT_WEEKLY_PPL,
  },
  {
    id: 'newbie-3',
    name: '新手三堂',
    badge: '新手',
    newbie: true,
    blurb: '一推／三拉／五腿（輕），其餘休息',
    slots: [
      { dayIndex: 0, nameZh: '一', templateId: 'newbie-ppl-starter', label: '新手推拉腿', hint: '輕器械' },
      { dayIndex: 1, nameZh: '二', templateId: null, label: '休息', hint: '' },
      { dayIndex: 2, nameZh: '三', templateId: 'newbie-leg-day', label: '新手腿日', hint: 'RDL／保加利亞' },
      { dayIndex: 3, nameZh: '四', templateId: null, label: '休息', hint: '' },
      { dayIndex: 4, nameZh: '五', templateId: 'fullbody', label: '全身', hint: '打底' },
      { dayIndex: 5, nameZh: '六', templateId: null, label: '休息', hint: '' },
      { dayIndex: 6, nameZh: '日', templateId: null, label: '休息', hint: '' },
    ],
  },
  {
    id: 'upper-lower',
    name: '上下身四日',
    badge: '上下',
    blurb: '一上二下四上五下',
    slots: [
      { dayIndex: 0, nameZh: '一', templateId: 'upper', label: '上身', hint: '' },
      { dayIndex: 1, nameZh: '二', templateId: 'lower', label: '下身', hint: '' },
      { dayIndex: 2, nameZh: '三', templateId: null, label: '休息', hint: '' },
      { dayIndex: 3, nameZh: '四', templateId: 'upper', label: '上身', hint: '' },
      { dayIndex: 4, nameZh: '五', templateId: 'lower', label: '下身', hint: '腿＋RDL' },
      { dayIndex: 5, nameZh: '六', templateId: null, label: '休息', hint: '' },
      { dayIndex: 6, nameZh: '日', templateId: null, label: '休息', hint: '' },
    ],
  },
  {
    id: 'leg-focus',
    name: '腿日加強',
    badge: '腿日',
    newbie: true,
    blurb: '一兩腿、三五上——Threads leg day 友善',
    slots: [
      { dayIndex: 0, nameZh: '一', templateId: 'newbie-leg-day', label: '新手腿日', hint: 'RDL／保加利亞' },
      { dayIndex: 1, nameZh: '二', templateId: 'upper', label: '上身', hint: '' },
      { dayIndex: 2, nameZh: '三', templateId: null, label: '休息', hint: '' },
      { dayIndex: 3, nameZh: '四', templateId: 'ppl-legs', label: '腿日', hint: '深蹲＋RDL' },
      { dayIndex: 4, nameZh: '五', templateId: 'ppl-push', label: '推日', hint: '' },
      { dayIndex: 5, nameZh: '六', templateId: null, label: '休息', hint: '' },
      { dayIndex: 6, nameZh: '日', templateId: null, label: '休息', hint: '' },
    ],
  },
  {
    id: 'busy-2',
    name: '忙碌兩日',
    badge: '忙碌',
    blurb: '一、四全身就得',
    slots: [
      { dayIndex: 0, nameZh: '一', templateId: 'fullbody', label: '全身', hint: '' },
      { dayIndex: 1, nameZh: '二', templateId: null, label: '休息', hint: '' },
      { dayIndex: 2, nameZh: '三', templateId: null, label: '休息', hint: '' },
      { dayIndex: 3, nameZh: '四', templateId: 'fullbody', label: '全身', hint: '' },
      { dayIndex: 4, nameZh: '五', templateId: null, label: '休息', hint: '' },
      { dayIndex: 5, nameZh: '六', templateId: null, label: '休息', hint: '' },
      { dayIndex: 6, nameZh: '日', templateId: null, label: '休息', hint: '' },
    ],
  },
]

export function applySchedulePreset(id: string): WeeklySlot[] {
  const preset = SCHEDULE_PRESETS.find((p) => p.id === id)
  const slots = (preset?.slots || DEFAULT_WEEKLY_PPL).map((s) => ({ ...s }))
  saveWeeklySchedule(slots)
  return slots
}

export type WeeklySlotProgress = {
  slot: WeeklySlot
  done: boolean
  isToday: boolean
}

export function computeWeeklySlotProgress(
  sessions: WorkoutSession[],
  now = new Date()
): WeeklySlotProgress[] {
  const slots = loadWeeklySchedule()
  const weekStart = startOfWeekMonday(now)
  const weekEnd = addDays(weekStart, 7)
  const dow = now.getDay()
  const dayIndex = dow === 0 ? 6 : dow - 1
  return slots.map((slot) => ({
    slot,
    done: slot.templateId
      ? slotDoneThisWeek(slot, sessions, weekStart, weekEnd)
      : false,
    isToday: slot.dayIndex === dayIndex,
  }))
}
