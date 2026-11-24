export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
}

export interface ParsedQuote {
  usd: number
  prevUsd: number
  at: number
  candles: Candle[]
}

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
        previousClose?: number
        regularMarketTime?: number
      }
      indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null> }> }
    }> | null
  }
}

/** Pull a real last price and candles out of a Yahoo chart payload. Returns null if the price is missing. */
export function parseYahooChart(body: unknown): ParsedQuote | null {
  const result = (body as YahooChart).chart?.result?.[0]
  const price = result?.meta?.regularMarketPrice
  if (!result || price == null || !Number.isFinite(price) || price <= 0) return null
  const times = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0]
  const candles: Candle[] = []
  for (let i = 0; i < times.length; i += 1) {
    const open = quote?.open?.[i]
    const high = quote?.high?.[i]
    const low = quote?.low?.[i]
    const close = quote?.close?.[i]
    if (open == null || high == null || low == null || close == null) continue
    if (![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue
    candles.push({ t: times[i] * 1000, o: open, h: high, l: low, c: close })
  }
  const sessionOpen = candles[0]?.o
  const prev = sessionOpen && sessionOpen > 0 ? sessionOpen : result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? price
  return {
    usd: price,
    prevUsd: Number.isFinite(prev) && prev > 0 ? prev : price,
    at: (result.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    candles: candles.slice(-78),
  }
}

export function toHkd(usd: number, fx: number): number {
  return usd * fx
}
