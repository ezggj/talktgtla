import assert from 'node:assert/strict'
import test from 'node:test'
import { canPublishRank, cleanNick, lossHkd, mergeStanding, rankGains, rankLosses } from './board'
import { formatDisplay, fromDisplay, toDisplay } from './display'
import { referenceLadder } from './ladder'

test('display currency converts with the live rate and does not invent one', () => {
  assert.equal(toDisplay(7800, 'HKD', 7.8), 7800)
  assert.equal(toDisplay(7800, 'USD', 7.8), 1000)
  assert.equal(toDisplay(7800, 'USD', null), null)
  assert.equal(fromDisplay(1000, 'USD', 7.8), 7800)
  assert.equal(fromDisplay(1000, 'USD', 0), null)
  assert.equal(formatDisplay(1_000_000, 'HKD', 7.8), 'HK$1,000,000')
  assert.equal(formatDisplay(7800, 'USD', 7.8), 'US$1,000')
  assert.equal(formatDisplay(7800, 'USD', null), '匯率未到')
})

test('the loss board ranks who is down the most, and guests cannot publish', () => {
  const rows = [
    { nickname: '阿明', equityHkd: 900_000 },
    { nickname: '阿芬', equityHkd: 400_000 },
    { nickname: '阿強', equityHkd: 1_200_000 },
  ]
  assert.equal(lossHkd(400_000), 600_000)
  assert.deepEqual(
    rankLosses(rows).map((row) => row.nickname),
    ['阿芬', '阿明', '阿強'],
  )
  assert.deepEqual(
    rankGains(rows).map((row) => row.nickname),
    ['阿強', '阿明', '阿芬'],
  )
  assert.equal(canPublishRank(null), false)
  assert.equal(canPublishRank('user-1'), true)
  assert.equal(cleanNick('  阿強  '), '阿強')
  assert.equal(cleanNick('a@b.com'), null)
})

test('a fresh local million does not wipe a played cloud balance', () => {
  assert.deepEqual(mergeStanding(1_000_000, false, 640_000), { equityHkd: 640_000, note: 'kept-server' })
  assert.deepEqual(mergeStanding(800_000, true, 640_000), { equityHkd: 800_000, note: 'local' })
  assert.deepEqual(mergeStanding(1_000_000, false, null), { equityHkd: 1_000_000, note: 'local' })
})

test('the reference ladder is only around the last quote', () => {
  const book = referenceLadder(100)
  assert.ok(book)
  assert.ok(book.asks.every((level) => level.price > 100))
  assert.ok(book.bids.every((level) => level.price < 100))
  assert.equal(referenceLadder(0), null)
})
