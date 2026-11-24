import { connection, NextResponse } from 'next/server'
import { FX_YAHOO, MARKETS } from '@/exchange/markets'
import { parseYahooChart, toHkd, type Candle } from '@/exchange/yahoo'

const FRESH_MS = 8_000
const STALE_OK_MS = 60_000

export interface PublicQuote {
  symbol: string
  name: string
  code: string
  kind: 'crypto' | 'stock'
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

async function pull(symbol: string): Promise<ReturnType<typeof parseYahooChart>> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`,
    {
      headers: { accept: 'application/json', 'user-agent': 'si-pan/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    },
  )
  if (!response.ok) return null
  return parseYahooChart(await response.json())
}

export async function GET() {
  await connection()
  const now = Date.now()
  if (memory && now - memory.at < FRESH_MS) return NextResponse.json(memory.body)

  const [fxQuote, ...charts] = await Promise.all([pull(FX_YAHOO), ...MARKETS.map((market) => pull(market.yahoo))])
  const fx = fxQuote?.usd ?? null
  if (fx == null || fx <= 0) {
    if (memory && now - memory.at < STALE_OK_MS) {
      const stale = { ...memory.body, stale: true }
      return NextResponse.json(stale)
    }
    const empty: Payload = { ok: false, stale: true, fx: null, asOf: null, quotes: [] }
    return NextResponse.json(empty)
  }

  const quotes: PublicQuote[] = []
  MARKETS.forEach((market, index) => {
    const parsed = charts[index]
    if (!parsed) return
    const age = now - parsed.at
    quotes.push({
      symbol: market.symbol,
      name: market.name,
      code: market.code,
      kind: market.kind,
      hkd: toHkd(parsed.usd, fx),
      prevHkd: toHkd(parsed.prevUsd, fx),
      at: parsed.at,
      candles: parsed.candles.map((candle) => ({
        t: candle.t,
        o: toHkd(candle.o, fx),
        h: toHkd(candle.h, fx),
        l: toHkd(candle.l, fx),
        c: toHkd(candle.c, fx),
      })),
      session: market.kind === 'stock' && age > 20 * 60_000 ? 'close' : 'live',
    })
  })

  const body: Payload = {
    ok: quotes.length > 0,
    stale: false,
    fx,
    asOf: now,
    quotes,
  }
  if (body.ok) memory = { at: now, body }
  else if (memory && now - memory.at < STALE_OK_MS) return NextResponse.json({ ...memory.body, stale: true })
  return NextResponse.json(body)
}
