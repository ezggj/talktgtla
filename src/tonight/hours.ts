const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }

function hkParts(now: Date): { day: number; minutes: number } | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  const day = DAY_INDEX[weekday.slice(0, 2)]
  if (day == null || !Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return { day, minutes: hour * 60 + minute }
}

function expandDays(token: string): number[] | null {
  const range = token.split('-').map((part) => part.trim())
  if (range.length === 1) {
    const day = DAY_INDEX[range[0]]
    return day == null ? null : [day]
  }
  if (range.length !== 2) return null
  const start = DAY_INDEX[range[0]]
  const end = DAY_INDEX[range[1]]
  if (start == null || end == null) return null
  const days: number[] = []
  let cursor = start
  for (let step = 0; step < 7; step += 1) {
    days.push(cursor)
    if (cursor === end) return days
    cursor = (cursor + 1) % 7
  }
  return days
}

function daysIn(spec: string): number[] | null {
  const cleaned = spec.replace(/\bPH\b/g, ' ').replace(/[、]/g, ',').trim()
  if (!cleaned) return null
  if (/\bSH\b/.test(cleaned)) return null
  const days: number[] = []
  for (const token of cleaned.split(',').map((part) => part.trim()).filter(Boolean)) {
    const expanded = expandDays(token)
    if (!expanded) return null
    days.push(...expanded)
  }
  return [...new Set(days)]
}

function timeRanges(spec: string): Array<[number, number]> | null {
  const matches = [...spec.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\+?/g)]
  if (!matches.length) return []
  const ranges: Array<[number, number]> = []
  for (const match of matches) {
    const start = Number(match[1]) * 60 + Number(match[2])
    let end = Number(match[3]) * 60 + Number(match[4])
    if (Number(match[1]) > 23 || Number(match[3]) > 23 || Number(match[2]) > 59 || Number(match[4]) > 59) return null
    if (start === end) return [[0, 1440]]
    if (end === 0) end = 1440
    else if (end <= start) end += 1440
    ranges.push([start, end])
  }
  return ranges
}

function ruleOf(raw: string): { days: number[]; ranges: Array<[number, number]>; off: boolean } | null {
  const text = raw.replace(/[–—]/g, '-').replace(/[、]/g, ',').trim()
  if (!text || /\bSH\b/.test(text)) return null
  const off = /\boff\b|\bclosed\b/i.test(text)
  const ranges = timeRanges(text)
  if (!ranges) return null
  const daySpec = text
    .replace(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\+?/g, ' ')
    .replace(/\boff\b|\bclosed\b/gi, ' ')
    .replace(/\bPH\b/g, ' ')
    .replace(/[, ]+/g, ' ')
    .trim()
  if (/[^A-Za-z \-]/.test(daySpec)) return null
  if (!daySpec && /\bPH\b/.test(text)) return null
  const days = daySpec ? daysIn(daySpec) : [0, 1, 2, 3, 4, 5, 6]
  if (!days || (!off && ranges.length === 0)) return null
  return { days, ranges, off }
}

/**
 * True, false, or null when the hours string is missing or not understood.
 * Unknown hours must not be treated as open.
 */
export function isOpenAt(hours: string | null, now: Date): boolean | null {
  if (!hours || !hours.trim()) return null
  if (/^24\s*\/\s*7$/.test(hours.trim())) return true
  const clock = hkParts(now)
  if (!clock) return null
  const byDay = new Map<number, Array<[number, number]>>()
  let parsed = 0
  for (const chunk of hours.split(';')) {
    const rule = ruleOf(chunk)
    if (!rule) continue
    parsed += 1
    for (const day of rule.days) {
      if (rule.off) byDay.delete(day)
      else byDay.set(day, [...(byDay.get(day) ?? []), ...rule.ranges])
    }
  }
  if (!parsed) return null
  const today = byDay.get(clock.day) ?? []
  for (const [start, end] of today) {
    if (clock.minutes >= start && clock.minutes < Math.min(end, 1440)) return true
  }
  const previous = byDay.get((clock.day + 6) % 7) ?? []
  for (const [, end] of previous) {
    if (end > 1440 && clock.minutes < end - 1440) return true
  }
  return false
}
