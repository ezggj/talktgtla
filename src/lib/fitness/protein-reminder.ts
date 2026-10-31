/** 蛋白晚間提醒 — 本地偏好 + 定時檢查（開住 app／PWA 時最準）. */

import { loadGoals, loadMeals, isSameDay } from './storage'
import {
  notificationPermission,
  requestNotificationPermissionCantonese,
  showAppNotification,
} from '@/lib/pwa/notifications'

const PREF_KEY = 'talktgtla-protein-remind-v1'
const FIRED_KEY = 'talktgtla-protein-remind-fired'

export type ProteinRemindPref = {
  enabled: boolean
  /** Hour in Asia/Hong_Kong 0–23, default 20 */
  hour: number
}

export function loadProteinRemindPref(): ProteinRemindPref {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return { enabled: false, hour: 20 }
    const p = JSON.parse(raw) as Partial<ProteinRemindPref>
    return {
      enabled: Boolean(p.enabled),
      hour: typeof p.hour === 'number' && p.hour >= 17 && p.hour <= 22 ? p.hour : 20,
    }
  } catch {
    return { enabled: false, hour: 20 }
  }
}

export function saveProteinRemindPref(pref: ProteinRemindPref) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref))
  } catch {
    /* ignore */
  }
}

function hkParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '0'
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  }
}

function todayProteinG(): number {
  return loadMeals()
    .filter((m) => isSameDay(m.createdAt))
    .reduce((s, m) => s + (m.macros?.protein || 0), 0)
}

function alreadyFiredToday(day: string): boolean {
  try {
    return localStorage.getItem(FIRED_KEY) === day
  } catch {
    return false
  }
}

function markFired(day: string) {
  try {
    localStorage.setItem(FIRED_KEY, day)
  } catch {
    /* ignore */
  }
}

/** If enabled + after remind hour + protein short → notify once per day. */
export async function checkProteinEveningReminder(): Promise<boolean> {
  const pref = loadProteinRemindPref()
  if (!pref.enabled) return false
  if (notificationPermission() !== 'granted') return false

  const { day, hour } = hkParts()
  if (hour < pref.hour) return false
  if (alreadyFiredToday(day)) return false

  const goal = loadGoals().proteinG || 150
  const got = Math.round(todayProteinG())
  if (got >= goal) {
    markFired(day) // already hit — don't nag later tonight
    return false
  }

  const short = Math.max(0, Math.round(goal - got))
  await showAppNotification({
    title: '蛋白仲差一截',
    body: `而家 ${got}g／目標 ${goal}g，仲差約 ${short}g——去飲食一掣加乳清或港式快加。`,
    tag: 'talktgtla-protein-evening',
    url: '/eat',
    renotify: true,
  })
  markFired(day)
  return true
}

export async function enableProteinReminder(hour = 20): Promise<{
  ok: boolean
  permission: NotificationPermission | 'unsupported'
}> {
  const perm = await requestNotificationPermissionCantonese()
  if (perm !== 'granted') {
    saveProteinRemindPref({ enabled: false, hour })
    return { ok: false, permission: perm }
  }
  saveProteinRemindPref({ enabled: true, hour })
  // Fire check soon in case already evening
  void checkProteinEveningReminder()
  return { ok: true, permission: perm }
}

export function disableProteinReminder() {
  const cur = loadProteinRemindPref()
  saveProteinRemindPref({ ...cur, enabled: false })
}
