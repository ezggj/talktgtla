import { connection, NextResponse } from 'next/server'
import { FX_YAHOO, MARKETS, marketBySymbol, type MarketKind } from '@/exchange/markets'
import { bucketCandles, parseTimeframe, yahooWindow } from '@/exchange/timeframes'
import { parseYahooChart, toHkd, type Candle } from '@/exchange/yahoo'

const FRESH_MS = 8_000
const STALE_OK_MS = 60_000

export interface PublicQuote {
  symbol: string
  name: string
  code: string
  kind: MarketKind
  feed: 'live' | 'delayed'
  hkd: number
  prevHkd: number
  at: number
  candles: Candle[]
  session: 'live' | 'close'
}

interface Payload {
  ok: boolean
  stale: boolean
  fx: number | null
  asOf: number | null
  quotes: PublicQuote[]
}

let memory: { at: number; body: Payload } | null = null

async function pull(symbol: string, interval = '5m', range = '1d'): Promise<ReturnType<typeof parseYahooChart>> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
    {
      headers: { accept: 'application/json', 'user-agent': 'si-pan/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    },
  )
  if (!response.ok) return null
  return parseYahooChart(await response.json())
}

function scale(value: number, quote: 'usd' | 'hkd', fx: number): number {
  return quote === 'usd' ? toHkd(value, fx) : value
}

function toQuote(market: (typeof MARKETS)[number], parsed: NonNullable<ReturnType<typeof parseYahooChart>>, fx: number, now: number): PublicQuote {
  const age = now - parsed.at
  return {
    symbol: market.symbol,
    name: market.name,
    code: market.code,
    kind: market.kind,
    feed: market.feed,
    hkd: scale(parsed.usd, market.quote, fx),
    prevHkd: scale(parsed.prevUsd, market.quote, fx),
    at: parsed.at,
    candles: parsed.candles.map((candle) => ({
      t: candle.t,
      o: scale(candle.o, market.quote, fx),
      h: scale(candle.h, market.quote, fx),
      l: scale(candle.l, market.quote, fx),
      c: scale(candle.c, market.quote, fx),
      v: candle.v,
    })),
    session: age > 20 * 60_000 ? 'close' : 'live',
  }
}

export async function GET(request: Request) {
  await connection()
  const url = new URL(request.url)
  const tf = parseTimeframe(url.searchParams.get('tf'))
  const symbol = url.searchParams.get('symbol')
  if (tf && tf !== '5m' && symbol) {
    const market = marketBySymbol(symbol)
    if (!market) return NextResponse.json({ ok: false, candles: [] })
    const window = yahooWindow(tf)
    const fxKnown = memory?.body.fx ?? null
    const [fxQuote, chart] = await Promise.all([
      fxKnown ? Promise.resolve(null) : pull(FX_YAHOO, '5m', '1d'),
      pull(market.yahoo, window.interval, window.range),
    ])
    const fx = fxKnown ?? fxQuote?.usd ?? null
    if (!chart || fx == null || fx <= 0) return NextResponse.json({ ok: false, candles: [] })
    let candles = chart.candles.map((candle) => ({
      t: candle.t,
      o: scale(candle.o, market.quote, fx),
      h: scale(candle.h, market.quote, fx),
      l: scale(candle.l, market.quote, fx),
      c: scale(candle.c, market.quote, fx),
      v: candle.v,
    }))
    if (window.bucketMs) candles = bucketCandles(candles, window.bucketMs)
    return NextResponse.json({ ok: true, symbol, tf, candles })
  }

  const now = Date.now()
  if (memory && now - memory.at < FRESH_MS) return NextResponse.json(memory.body)

  const [fxQuote, ...charts] = await Promise.all([pull(FX_YAHOO), ...MARKETS.map((market) => pull(market.yahoo))])
  const fx = fxQuote?.usd ?? null
  if (fx == null || fx <= 0) {
    if (memory && now - memory.at < STALE_OK_MS) return NextResponse.json({ ...memory.body, stale: true })
    const empty: Payload = { ok: false, stale: true, fx: null, asOf: null, quotes: [] }
    return NextResponse.json(empty)
  }

  const quotes: PublicQuote[] = []
  MARKETS.forEach((market, index) => {
    const parsed = charts[index]
    if (!parsed) return
    quotes.push(toQuote(market, parsed, fx, now))
  })

  const body: Payload = { ok: quotes.length > 0, stale: false, fx, asOf: now, quotes }
  if (body.ok) memory = { at: now, body }
  else if (memory && now - memory.at < STALE_OK_MS) return NextResponse.json({ ...memory.body, stale: true })
  return NextResponse.json(body)
}
