import assert from 'node:assert/strict'
import test from 'node:test'
import {
  STARTING_HKD,
  equity,
  freshAccount,
  isLiquidated,
  liquidationPrice,
  placeLimit,
  realizedPnl,
  settle,
  trade,
  unrealized,
} from './book'
import { leverageWarning, marketLine } from './story'
import { parseYahooChart } from './yahoo'

test('a long makes the real price difference, and a 10x long dies on a 10% drop', () => {
  const opened = trade(freshAccount(), { symbol: 'BTC', side: 'long', notional: 10_000, leverage: 10, price: 100 })
  assert.equal(opened.ok, true)
  if (!opened.ok) return
  const position = opened.account.positions[0]
  assert.equal(unrealized(position, 110), 1000)
  assert.ok(Math.abs(liquidationPrice(position) - 90) < 1e-6)
  assert.equal(isLiquidated(position, 90), true)
  assert.equal(isLiquidated(position, 90.01), false)
  const settled = settle(opened.account, { BTC: 90 }, true)
  assert.equal(settled.events[0]?.kind, 'liq')
  assert.equal(settled.account.positions.length, 0)
  assert.ok(Math.abs(settled.events[0].pnl + 1000) < 1e-6)
  assert.ok(equity(settled.account, {}) < STARTING_HKD)
})

test('a short dies when price rises by one over leverage, including 500x', () => {
  const opened = trade(freshAccount(), { symbol: 'AAPL', side: 'short', notional: 50_000, leverage: 500, price: 200 })
  assert.equal(opened.ok, true)
  if (!opened.ok) return
  const position = opened.account.positions[0]
  const liq = liquidationPrice(position)
  assert.ok(Math.abs(liq - 200 * (1 + 1 / 500)) < 1e-6)
  assert.equal(isLiquidated(position, liq), true)
  const alive = settle(opened.account, { AAPL: liq - 0.01 }, true)
  assert.equal(alive.account.positions.length, 1)
  const dead = settle(opened.account, { AAPL: liq }, true)
  assert.equal(dead.events[0]?.kind, 'liq')
  assert.equal(dead.account.streak, 0)
})

test('opening spends margin plus the fee, and a missing price does not invent a fill', () => {
  const opened = trade(freshAccount(), { symbol: 'ETH', side: 'long', notional: 10_000, leverage: 5, price: 50 })
  assert.equal(opened.ok, true)
  if (!opened.ok) return
  const fee = 10_000 * 0.0004
  assert.ok(Math.abs(opened.account.cash - (STARTING_HKD - 2000 - fee)) < 1e-6)
  assert.equal(trade(freshAccount(), { symbol: 'ETH', side: 'long', notional: 10_000, leverage: 5, price: null }).ok, false)
  assert.equal(trade(opened.account, { symbol: 'TSLA', side: 'long', notional: opened.account.cash * 50, leverage: 2, price: 10 }).ok, false)
  assert.equal(opened.account.positions.length, 1)
})

test('adding averages the entry, and the other side realises the difference', () => {
  const first = trade(freshAccount(), { symbol: 'SPY', side: 'long', notional: 10_000, leverage: 2, price: 100 })
  assert.equal(first.ok, true)
  if (!first.ok) return
  const added = trade(first.account, { symbol: 'SPY', side: 'long', notional: 10_000, leverage: 2, price: 120 })
  assert.equal(added.ok, true)
  if (!added.ok) return
  const position = added.account.positions[0]
  assert.ok(Math.abs(position.entry - (100 * 100 + (10_000 / 120) * 120) / (100 + 10_000 / 120)) < 1e-6)
  const closed = trade(added.account, { symbol: 'SPY', side: 'short', notional: position.qty * 130, leverage: 2, price: 130 })
  assert.equal(closed.ok, true)
  if (!closed.ok) return
  assert.equal(closed.account.positions.length, 0)
  assert.ok(closed.account.streak >= 1)
  assert.ok(realizedPnl(closed.account, {}) > 0)
})

test('a limit order waits for the real price and a stale book does not liquidate', () => {
  const parked = placeLimit(freshAccount(), {
    symbol: 'NVDA',
    side: 'long',
    notional: 5_000,
    leverage: 10,
    price: 100,
    limit: 90,
  })
  assert.equal(parked.ok, true)
  if (!parked.ok) return
  const waiting = settle(parked.account, { NVDA: 95 }, true)
  assert.equal(waiting.account.positions.length, 0)
  const filled = settle(parked.account, { NVDA: 89 }, true)
  assert.equal(filled.events[0]?.kind, 'fill')
  assert.equal(filled.account.positions.length, 1)
  assert.equal(filled.account.positions[0].entry, 89)
  const doomed = trade(freshAccount(), { symbol: 'NVDA', side: 'long', notional: 10_000, leverage: 10, price: 100 })
  assert.equal(doomed.ok, true)
  if (!doomed.ok) return
  const frozen = settle(doomed.account, { NVDA: 1 }, false)
  assert.equal(frozen.events.length, 0)
  assert.equal(frozen.account.positions.length, 1)
})

test('the market line only talks about numbers it was given', () => {
  assert.match(marketLine([{ name: '比特幣', pct: null }]), /攞唔到/)
  assert.match(marketLine([{ name: '比特幣', pct: 1.24 }, { name: '蘋果', pct: -0.2 }]), /比特幣而家升 1\.2%/)
  assert.match(marketLine([{ name: '蘋果', pct: -2.04 }]), /蘋果而家跌 2\.0%/)
  assert.match(marketLine([{ name: '標普', pct: 0.01 }]), /好靜/)
  assert.match(leverageWarning(500), /500 倍/)
  assert.match(leverageWarning(500), /0\.20%/)
})

test('yahoo payload without a price is not turned into a quote', () => {
  assert.equal(parseYahooChart({ chart: { result: [{ meta: {} }] } }), null)
  const parsed = parseYahooChart({
    chart: {
      result: [
        {
          timestamp: [10, 20],
          meta: { regularMarketPrice: 100, chartPreviousClose: 90, regularMarketTime: 20 },
          indicators: { quote: [{ open: [90, null], high: [101, 110], low: [89, 99], close: [100, 105] }] },
        },
      ],
    },
  })
  assert.ok(parsed)
  assert.equal(parsed?.usd, 100)
  assert.equal(parsed?.candles.length, 1)
  assert.equal(parsed?.candles[0].c, 100)
})
