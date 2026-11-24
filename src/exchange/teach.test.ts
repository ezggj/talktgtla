import assert from 'node:assert/strict'
import test from 'node:test'
import { drawdown, hongKongWeek, rankSteady, rankWeekProfit } from './challenges'
import { exponentialAverage, movingAverage } from './indicators'
import { freshnessLabel, marketBySymbol } from './markets'
import { tradeRecap } from './recap'
import { demoSide } from './follow'
import { deskHighlight } from './story'
import { highLeverageWarning, isTutorialDone, TUTORIAL_STEPS } from './tutorial'
import { bucketCandles, parseTimeframe, yahooWindow } from './timeframes'

test('100x and 500x warnings state the liquidation distance', () => {
  assert.match(highLeverageWarning(100) ?? '', /1%/)
  assert.match(highLeverageWarning(500) ?? '', /0\.2%/)
  assert.equal(highLeverageWarning(5), null)
  assert.equal(highLeverageWarning(20), null)
})

test('the first-run tutorial is five short steps and stays done once stored', () => {
  assert.equal(TUTORIAL_STEPS.length, 5)
  assert.ok(TUTORIAL_STEPS.some((step) => step.title.includes('開多')))
  assert.ok(TUTORIAL_STEPS.some((step) => step.title.includes('保證金')))
  assert.equal(isTutorialDone(null), false)
  assert.equal(isTutorialDone('1'), true)
  assert.equal(isTutorialDone('0'), false)
})

test('new Hong Kong names use the public symbols and do not pretend delayed quotes are live', () => {
  assert.equal(marketBySymbol('HSI')?.yahoo, '^HSI')
  assert.equal(marketBySymbol('0700')?.yahoo, '0700.HK')
  assert.equal(marketBySymbol('3690')?.name, '美團')
  assert.equal(marketBySymbol('9988')?.name, '阿里')
  assert.equal(marketBySymbol('GOLD')?.yahoo, 'GC=F')
  assert.equal(marketBySymbol('OIL')?.yahoo, 'CL=F')
  assert.equal(marketBySymbol('0700')?.quote, 'hkd')
  assert.equal(freshnessLabel('delayed', 'live', 'stock'), '延遲')
  assert.equal(freshnessLabel('live', 'live', 'crypto'), '即時')
  assert.equal(freshnessLabel('delayed', 'close', 'stock'), '收市 · 延遲')
})

test('timeframes map onto real Yahoo windows, and 4H is bucketed from hourly bars', () => {
  assert.equal(parseTimeframe('1m'), '1m')
  assert.equal(parseTimeframe('nope'), null)
  assert.deepEqual(yahooWindow('15m'), { interval: '15m', range: '5d', bucketMs: null })
  assert.equal(yahooWindow('1h').interval, '60m')
  assert.equal(yahooWindow('4h').bucketMs, 4 * 60 * 60 * 1000)
  const hour = 60 * 60 * 1000
  const start = Date.UTC(2026, 10, 24, 0, 0, 0)
  const candles = [0, 1, 2, 3, 4].map((step) => ({
    t: start + step * hour,
    o: 10 + step,
    h: 12 + step,
    l: 9,
    c: 11 + step,
    v: 2,
  }))
  const bars = bucketCandles(candles, 4 * hour)
  assert.equal(bars.length, 2)
  assert.equal(bars[0].o, 10)
  assert.equal(bars[0].c, 14)
  assert.equal(bars[0].v, 8)
  assert.equal(bars[0].h, 15)
})

test('moving averages only start once the window is full', () => {
  const ma = movingAverage([1, 2, 3, 4], 3)
  assert.deepEqual(ma, [null, null, 2, 3])
  const ema = exponentialAverage([1, 2, 3, 4], 3)
  assert.equal(ema[0], null)
  assert.equal(ema[1], null)
  assert.ok(ema[3] != null && ema[3]! >= 3)
})

test('weekly profit and steady ranks use virtual equity, not a guess', () => {
  const rows = [
    { nickname: '甲', equityHkd: 1_100_000, peakHkd: 1_200_000, weekPnlHkd: 40_000 },
    { nickname: '乙', equityHkd: 1_050_000, peakHkd: 1_060_000, weekPnlHkd: 80_000 },
    { nickname: '丙', equityHkd: 900_000, peakHkd: 1_000_000, weekPnlHkd: -20_000 },
  ]
  assert.deepEqual(rankWeekProfit(rows).map((row) => row.nickname), ['乙', '甲', '丙'])
  assert.deepEqual(rankSteady(rows).map((row) => row.nickname), ['乙', '甲'])
  assert.ok(drawdown(rows[0]) > drawdown(rows[1]))
  const monday = hongKongWeek(new Date('2026-11-24T02:00:00Z'))
  assert.equal(monday, '2026-11-23')
})

test('a closed trade recap comes from the fill, and demo follow is labelled by the day move', () => {
  const recap = tradeRecap({ action: 'close', side: 'long', qty: 1, price: 110, pnl: 10 - 110 * 0.0004 })
  assert.match(recap ?? '', /賺咗/)
  assert.match(recap ?? '', /升/)
  assert.match(tradeRecap({ action: 'liq', side: 'short', qty: 1, price: 120, pnl: -200 }) ?? '', /爆倉/)
  assert.equal(tradeRecap({ action: 'open', side: 'long', qty: 1, price: 100, pnl: -0.04 }), null)
  assert.equal(demoSide('trend', 1.2), 'long')
  assert.equal(demoSide('fade', 1.2), 'short')
})

test('the daily line only uses the percentages it was given', () => {
  const line = deskHighlight([
    { name: '騰訊', pct: 2.4 },
    { name: '恆指', pct: -0.8 },
  ])
  assert.match(line, /騰訊/)
  assert.match(line, /2\.4%/)
  assert.match(line, /恆指/)
  assert.doesNotMatch(line, /新聞/)
})
