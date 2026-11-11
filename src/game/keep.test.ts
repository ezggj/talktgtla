import assert from 'node:assert/strict'
import test from 'node:test'
import { cityNickname, nextGoal, snapOf, todayStory, tomorrowLine } from './keep'
import { DAY_MS, newGame, place, summarize, tick } from './sim'
import { terrainAt } from './map'

test('after the first hint the next goal is a real tram link', () => {
  const state = newGame(7)
  state.guide = false
  const summary = summarize(state)
  assert.equal(nextGoal(state, snapOf(summary)).text, '將電車駁去銅鑼灣')
  state.trams = [...state.trams, 't-cwb']
  assert.equal(nextGoal(state, summarize(state) && snapOf(summarize(state))).text, '港島綫駁到灣仔')
})

test('a powered home with a shop and a park grows a floor, then drops without the road', () => {
  const state = newGame(11, true)
  state.day = 0
  let spot: { c: number; r: number } | null = null
  for (let r = 4; r < 200 && !spot; r++) {
    for (let c = 4; c < 200 && !spot; c++) {
      const cells = [
        [c, r],
        [c, r + 1],
        [c + 1, r],
        [c - 1, r],
        [c, r - 1],
      ]
      if (cells.every(([x, y]) => terrainAt(x, y, 11) === 'land' || terrainAt(x, y, 11) === 'shore')) spot = { c, r }
    }
  }
  assert.ok(spot)
  place(state, 'road', spot.c, spot.r)
  place(state, 'power', spot.c, spot.r + 1)
  place(state, 'shop', spot.c + 1, spot.r)
  place(state, 'park', spot.c, spot.r - 1)
  place(state, 'home', spot.c - 1, spot.r)
  const home = state.cells.find((cell) => cell.kind === 'home')
  const shop = state.cells.find((cell) => cell.kind === 'shop')
  assert.ok(home && shop)
  tick(state, DAY_MS)
  assert.equal(home.stage, 1)
  tick(state, DAY_MS)
  assert.equal(shop.stage, 1)
  tick(state, DAY_MS * 3)
  assert.ok(home.stage >= 2)
  const tall = home.stage
  place(state, 'bulldoze', spot.c, spot.r)
  tick(state, DAY_MS)
  assert.ok(home.stage < tall)
})

test('the city name and the daily line come from what is actually there', () => {
  const state = newGame(7)
  state.guide = false
  const snap = snapOf(summarize(state))
  assert.equal(cityNickname(state, snap), '電車之城')
  assert.match(todayStory(snap, null), /今日/)
  assert.match(todayStory(snap, '將電車駁去銅鑼灣'), /做到/)
  const tease = tomorrowLine(state.day, state.seed, true)
  assert.ok(tease.length > 4)
})

test('a missing harbour crossing is called out for tomorrow morning', () => {
  assert.equal(tomorrowLine(4.2, 1, false), '聽日朝早過海會塞。')
})
