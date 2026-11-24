import type { Candle } from './yahoo'

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Timeframe = (typeof TIMEFRAMES)[number]

export function parseTimeframe(raw: string | null): Timeframe | null {
  return TIMEFRAMES.includes(raw as Timeframe) ? (raw as Timeframe) : null
}

export function yahooWindow(tf: Timeframe): { interval: string; range: string; bucketMs: number | null } {
  if (tf === '1m') return { interval: '1m', range: '1d', bucketMs: null }
  if (tf === '5m') return { interval: '5m', range: '1d', bucketMs: null }
  if (tf === '15m') return { interval: '15m', range: '5d', bucketMs: null }
  if (tf === '1h') return { interval: '60m', range: '1mo', bucketMs: null }
  if (tf === '4h') return { interval: '60m', range: '3mo', bucketMs: 4 * 60 * 60 * 1000 }
  return { interval: '1d', range: '1y', bucketMs: null }
}

/** Fold real candles into a wider bar. Used for 4H, which Yahoo does not send directly. */
export function bucketCandles(candles: readonly Candle[], bucketMs: number): Candle[] {
  const buckets = new Map<number, Candle>()
  for (const candle of candles) {
    const key = Math.floor(candle.t / bucketMs) * bucketMs
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, { ...candle, t: key, v: candle.v ?? 0 })
      continue
    }
    existing.h = Math.max(existing.h, candle.h)
    existing.l = Math.min(existing.l, candle.l)
    existing.c = candle.c
    existing.v = (existing.v ?? 0) + (candle.v ?? 0)
  }
  return [...buckets.values()]
}
