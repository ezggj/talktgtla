import { hkDayKey } from './hk-day'

/** Free 「問 AI」 asks per Hong Kong calendar day. Logging a set does not use this. */
export const TRAIN_AI_FREE_DAILY_LIMIT = 3

const KEY = 'talktgtla-train-ai-asks-v1'

export type TrainAiQuota = {
  day: string
  used: number
  limit: number
  remaining: number
}

export function trainAiLimitCopy(limit = TRAIN_AI_FREE_DAILY_LIMIT) {
  return `今日問 AI 用完 ${limit} 次喇，聽日再問。平時嘅小提示仍然喺度。`
}

export function serverTrainAiLimit(): number {
  const raw = Number(process.env.TRAIN_AI_FREE_DAILY_LIMIT || TRAIN_AI_FREE_DAILY_LIMIT)
  if (!Number.isFinite(raw)) return TRAIN_AI_FREE_DAILY_LIMIT
  return Math.min(20, Math.max(1, Math.floor(raw)))
}

/** Cookie value is `YYYY-MM-DD:used`. A different day resets to 0. */
export function parseTrainAiCookie(raw: string | undefined | null, day: string): number {
  if (!raw) return 0
  const [d, n] = raw.split(':')
  if (d !== day) return 0
  const used = Number(n)
  if (!Number.isFinite(used) || used < 0) return 0
  return Math.floor(used)
}

export function nextTrainAiCount(used: number, limit: number): {
  ok: boolean
  used: number
  remaining: number
} {
  if (used >= limit) return { ok: false, used, remaining: 0 }
  const next = used + 1
  return { ok: true, used: next, remaining: Math.max(0, limit - next) }
}

export function peekTrainAiQuota(now = new Date()): TrainAiQuota {
  const day = hkDayKey(now)
  const limit = TRAIN_AI_FREE_DAILY_LIMIT
  if (typeof window === 'undefined') {
    return { day, used: 0, limit, remaining: limit }
  }
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<TrainAiQuota>) : null
    if (!parsed || parsed.day !== day) {
      return { day, used: 0, limit, remaining: limit }
    }
    const used = Math.max(0, Math.floor(Number(parsed.used) || 0))
    const knownLimit = Math.max(1, Math.floor(Number(parsed.limit) || limit))
    return {
      day,
      used,
      limit: knownLimit,
      remaining: Math.max(0, knownLimit - used),
    }
  } catch {
    return { day, used: 0, limit, remaining: limit }
  }
}

export function rememberTrainAiQuota(quota: Pick<TrainAiQuota, 'day' | 'used' | 'limit'>): TrainAiQuota {
  const used = Math.max(0, Math.floor(quota.used))
  const limit = Math.max(1, Math.floor(quota.limit || TRAIN_AI_FREE_DAILY_LIMIT))
  const next: TrainAiQuota = {
    day: quota.day,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: next.day, used: next.used, limit: next.limit }))
  } catch {
    /* ignore */
  }
  return next
}
