/**
 * In-memory sliding-window rate limiter (per serverless instance).
 * Durable limit also enforced in Supabase post_message RPC.
 */

type Bucket = number[]

const store = new Map<string, Bucket>()

const MAX_ENTRIES = 5000

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number }

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - opts.windowMs
  let hits = store.get(key) ?? []
  hits = hits.filter((t) => t > cutoff)

  if (hits.length >= opts.limit) {
    store.set(key, hits)
    const oldest = hits[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000))
    return { ok: false, retryAfterSec }
  }

  hits.push(now)
  store.set(key, hits)

  if (store.size > MAX_ENTRIES) {
    // Drop oldest keys roughly
    const excess = store.size - MAX_ENTRIES
    let i = 0
    for (const k of store.keys()) {
      store.delete(k)
      if (++i >= excess) break
    }
  }

  return { ok: true, remaining: opts.limit - hits.length }
}

/** Primary: 8 msgs / 60s. Burst: 3 msgs / 10s. */
export const RATE_LIMIT_WINDOW = { limit: 8, windowMs: 60_000 } as const
export const RATE_LIMIT_BURST = { limit: 3, windowMs: 10_000 } as const
