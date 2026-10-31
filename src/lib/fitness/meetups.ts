/** 開台凑局 — gym branch + time slot meetups (real people, no bots). */

import { HK_GYMS, type HkGym } from './hk-gyms'

export const MEETUP_FOCUSES = [
  '胸',
  '背',
  '腿',
  '肩',
  '手臂',
  '臀',
  '核心',
  '全身',
  '有氧',
  '報到',
] as const

export type MeetupFocus = (typeof MEETUP_FOCUSES)[number]

export type GymMeetup = {
  id: string
  created_at: string
  host_user_id: string | null
  host_guest_id: string | null
  host_name: string
  gym_id: string
  gym_name: string
  area: string
  slot_at: string
  focus: string
  note: string | null
  status: 'open' | 'cancelled' | 'done'
  join_count: number
}

export type MeetupJoin = {
  id: string
  meetup_id: string
  user_id: string | null
  guest_id: string | null
  display_name: string
  joined_at: string
}

const GUEST_KEY = 'talktgtla-meetup-guest-v1'
const NAME_KEY = 'talktgtla-meetup-name-v1'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function getMeetupGuestId(): string {
  if (typeof window === 'undefined') return 'guest_ssr'
  try {
    const existing = localStorage.getItem(GUEST_KEY)?.trim()
    if (existing) return existing.slice(0, 80)
    const id = randomId().slice(0, 80)
    localStorage.setItem(GUEST_KEY, id)
    return id
  } catch {
    return randomId().slice(0, 80)
  }
}

export function loadMeetupDisplayName(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function saveMeetupDisplayName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 24))
  } catch {
    /* ignore */
  }
}

/** Popular areas for picker — 247 first, then other gyms' unique areas. */
export function meetupAreaOptions(gymId?: string): { gym: HkGym; areas: string[] }[] {
  const list = gymId ? HK_GYMS.filter((g) => g.id === gymId) : HK_GYMS
  return list
    .filter((g) => g.areas.length > 0)
    .map((g) => ({
      gym: g,
      areas: g.areas.slice(0, g.id === '247-fitness' ? 48 : 16),
    }))
}

export function featuredMeetupGyms(): HkGym[] {
  const featured = HK_GYMS.filter((g) => g.featured || g.id === '247-fitness')
  const rest = HK_GYMS.filter((g) => !featured.some((f) => f.id === g.id)).slice(0, 8)
  return [...featured, ...rest]
}


/** Hot 247 branches for empty-state quick open — HK-popular corridors. */
export function popularMeetupBranches(limit = 10): string[] {
  const gym = HK_GYMS.find((g) => g.id === '247-fitness')
  const preferred = [
    '旺角',
    '觀塘',
    '銅鑼灣',
    '尖沙咀',
    '荃灣',
    '沙田',
    '將軍澳',
    '小西灣',
    '長沙灣',
    '屯門',
    '元朗',
    '北角',
  ]
  const areas = new Set(gym?.areas || [])
  const out = preferred.filter((a) => areas.has(a))
  if (out.length < limit && gym) {
    for (const a of gym.areas) {
      if (!out.includes(a)) out.push(a)
      if (out.length >= limit) break
    }
  }
  return out.slice(0, limit)
}


/** Count open meetups per area for "現場" chips (today + upcoming open). */
export function meetupAreaCounts(meetups: GymMeetup[]): { area: string; count: number; gymName: string }[] {
  const map = new Map<string, { area: string; count: number; gymName: string }>()
  for (const m of meetups) {
    if (m.status !== 'open') continue
    const key = `${m.gym_id}::${m.area}`
    const cur = map.get(key)
    if (cur) cur.count += 1
    else map.set(key, { area: m.area, count: 1, gymName: m.gym_name })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'zh-HK'))
}

export function filterMeetupsByArea(meetups: GymMeetup[], area: string | null): GymMeetup[] {
  if (!area) return meetups
  return meetups.filter((m) => m.area === area)
}

export function formatMeetupSlot(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return iso
  }
}

/** Quick slot presets relative to now (HK). */
export function meetupSlotPresets(): { label: string; iso: string }[] {
  const now = new Date()
  const hkOffsetMs = 8 * 3600 * 1000
  // Work in HK local wall time via Intl parts
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00'
  const y = Number(get('year'))
  const mo = Number(get('month'))
  const da = Number(get('day'))
  const hour = Number(get('hour'))

  const at = (dayOffset: number, h: number, m: number, label: string) => {
    // Construct as UTC instant representing that HK local time
    const utc = Date.UTC(y, mo - 1, da + dayOffset, h, m) - hkOffsetMs
    return { label, iso: new Date(utc).toISOString() }
  }

  const out: { label: string; iso: string }[] = []
  if (hour < 12) out.push(at(0, 12, 30, '今日晏晝 12:30'))
  if (hour < 18) out.push(at(0, 18, 30, '今日黃昏 18:30'))
  if (hour < 21) out.push(at(0, 21, 0, '今日夜晚 21:00'))
  out.push(at(1, 7, 30, '聽朝 07:30'))
  out.push(at(1, 12, 30, '聽日晏晝 12:30'))
  out.push(at(1, 18, 30, '聽日黃昏 18:30'))
  out.push(at(1, 21, 0, '聽日夜晚 21:00'))
  return out.filter((s) => new Date(s.iso).getTime() > Date.now() - 5 * 60 * 1000)
}
