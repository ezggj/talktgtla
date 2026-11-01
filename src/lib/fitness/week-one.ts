/** First-week checklist. Flags stay on this device; workout / meal / plan follow data that already syncs. */

import { loadActivePlan } from './plan-store'

export const WEEK_ONE_KEY = 'talktgtla-week-one-v1'
export const WEEK_ONE_EVENT = 'talktgtla-week-one'

export type WeekOneId = 'workout' | 'hkMeal' | 'goal' | 'chip'

export type WeekOneFlags = {
  dismissed: boolean
  hidden: boolean
  goalSet: boolean
  chipTried: boolean
}

const DEFAULT_FLAGS: WeekOneFlags = {
  dismissed: false,
  hidden: false,
  goalSet: false,
  chipTried: false,
}

export type WeekOneItem = {
  id: WeekOneId
  title: string
  href: string
  done: boolean
}

type ProgressInput = {
  finishedWorkouts: number
  hkQuickMeals: number
  hasPlan?: boolean
}

function readRaw(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(WEEK_ONE_KEY) || ''
  } catch {
    return ''
  }
}

function parseFlags(raw: string): WeekOneFlags {
  if (!raw) return DEFAULT_FLAGS
  try {
    const p = JSON.parse(raw) as Partial<WeekOneFlags>
    return {
      dismissed: Boolean(p.dismissed),
      hidden: Boolean(p.hidden),
      goalSet: Boolean(p.goalSet),
      chipTried: Boolean(p.chipTried),
    }
  } catch {
    return DEFAULT_FLAGS
  }
}

function writeFlags(next: WeekOneFlags) {
  try {
    localStorage.setItem(WEEK_ONE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(WEEK_ONE_EVENT))
  } catch {
    /* ignore quota */
  }
}

export function loadWeekOneFlags(): WeekOneFlags {
  return parseFlags(readRaw())
}

export function dismissWeekOne() {
  writeFlags({ ...loadWeekOneFlags(), dismissed: true })
}

export function setWeekOneHidden(hidden: boolean) {
  const cur = loadWeekOneFlags()
  writeFlags({ ...cur, hidden, dismissed: hidden ? cur.dismissed : false })
}

export function markWeekOneGoal() {
  const cur = loadWeekOneFlags()
  if (cur.goalSet) return
  writeFlags({ ...cur, goalSet: true })
}

export function markWeekOneChip() {
  const cur = loadWeekOneFlags()
  if (cur.chipTried) return
  writeFlags({ ...cur, chipTried: true })
}

/** Meal logged from the 港式快加 row. Note survives account sync. */
export function mealIsHkQuickAdd(meal: { note?: string | null }): boolean {
  return Boolean(meal.note && meal.note.includes('港式快加'))
}

export function weekOneItems(input: ProgressInput, flags: WeekOneFlags = loadWeekOneFlags()): WeekOneItem[] {
  const plan = input.hasPlan ?? false
  return [
    {
      id: 'workout',
      title: '完第一次訓練',
      href: '/train',
      done: input.finishedWorkouts > 0,
    },
    {
      id: 'hkMeal',
      title: '港式快加記一餐',
      href: '/eat',
      done: input.hkQuickMeals > 0,
    },
    {
      id: 'goal',
      title: '定 protein 目標或課表',
      href: '/me',
      done: flags.goalSet || plan,
    },
    {
      id: 'chip',
      title: '撳一個傾偈話題',
      href: '/',
      done: flags.chipTried,
    },
  ]
}

export function weekOneDoneCount(items: WeekOneItem[]) {
  return items.filter((item) => item.done).length
}

export function weekOneAllDone(items: WeekOneItem[]) {
  return items.length > 0 && items.every((item) => item.done)
}

export function weekOneVisible(items: WeekOneItem[], flags: WeekOneFlags) {
  if (flags.hidden || flags.dismissed) return false
  return !weekOneAllDone(items)
}

export type WeekOneSnap = { flags: WeekOneFlags; hasPlan: boolean }

const SERVER_SNAP: WeekOneSnap = { flags: DEFAULT_FLAGS, hasPlan: false }
let snap: WeekOneSnap = SERVER_SNAP
let snapKey = ''

export function readWeekOneSnap(): WeekOneSnap {
  if (typeof window === 'undefined') return SERVER_SNAP
  const flagsRaw = readRaw()
  let planRaw = ''
  try {
    planRaw = localStorage.getItem('talktgtla-active-plan-v1') || ''
  } catch {
    planRaw = ''
  }
  const key = `${flagsRaw}\n${planRaw}`
  if (key === snapKey) return snap
  snapKey = key
  const flags = parseFlags(flagsRaw)
  let hasPlan = false
  try {
    hasPlan = Boolean(loadActivePlan()?.plan?.days?.length)
  } catch {
    hasPlan = false
  }
  snap = { flags, hasPlan }
  return snap
}

export function subscribeWeekOne(onStoreChange: () => void) {
  window.addEventListener(WEEK_ONE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(WEEK_ONE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function weekOneServerSnap(): WeekOneSnap {
  return SERVER_SNAP
}
