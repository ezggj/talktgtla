import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemo } from './demo'
import { terrainAt } from './map'
import { parseSave, serialize } from './save'
import { bulldoze, DAY_MS, newGame, place, summarize, tick } from './sim'
import { COST, START_MONEY } from './types'

function dry(seed: number, c: number, r: number) {
  return terrainAt(c, r, seed) !== 'water'
}

function findSpine(seed: number) {
  for (let r = 1; r < 18; r++) {
    for (let c = 1; c < 28; c++) {
      const power = { c, r: r + 1 }
      const home = { c: c + 1, r }
      if (dry(seed, c, r) && dry(seed, power.c, power.r) && dry(seed, home.c, home.r)) {
        return { road: { c, r }, power, home }
      }
    }
  }
  return null
}

test('placing a road spends treasury and bulldoze refunds a bit', () => {
  const state = newGame(3)
  const spot = findSpine(3)
  assert.ok(spot)
  const placed = place(state, 'road', spot.road.c, spot.road.r)
  assert.equal(placed.ok, true)
  assert.equal(state.money, START_MONEY - COST.road)
  const removed = bulldoze(state, spot.road.c, spot.road.r)
  assert.equal(removed.ok, true)
  assert.equal(state.money, START_MONEY - COST.road + Math.round(COST.road * 0.35))
  assert.equal(state.cells.length, 0)
})

test('water and empty tiles reject the wrong tool', () => {
  const state = newGame(4)
  let water: { c: number; r: number } | null = null
  for (let r = 0; r < 32 && !water; r++) {
    for (let c = 0; c < 32 && !water; c++) {
      if (terrainAt(c, r, 4) === 'water') water = { c, r }
    }
  }
  assert.ok(water)
  const blocked = place(state, 'home', water.c, water.r)
  assert.equal(blocked.ok, false)
  if (!blocked.ok) assert.equal(blocked.reason, 'water')
  assert.equal(state.money, START_MONEY)
  const empty = place(state, 'bulldoze', 1, 1)
  assert.equal(empty.ok, false)
  if (!empty.ok) assert.equal(empty.reason, 'empty')
})

test('a house beside a powered road grows, and a cut road stops it', () => {
  const state = newGame(5)
  state.day = 0
  const spot = findSpine(5)
  assert.ok(spot)
  assert.equal(place(state, 'road', spot.road.c, spot.road.r).ok, true)
  assert.equal(place(state, 'power', spot.power.c, spot.power.r).ok, true)
  assert.equal(place(state, 'home', spot.home.c, spot.home.r).ok, true)
  assert.equal(place(state, 'shop', spot.home.c, spot.home.r).ok, false)

  tick(state, DAY_MS)
  const home = state.cells.find((cell) => cell.kind === 'home')
  assert.ok(home)
  assert.equal(home.stage, 1)
  assert.equal(summarize(state).pop, 18)
  tick(state, DAY_MS)
  assert.equal(home.stage, 2)
  assert.equal(summarize(state).pop, 42)
  const stray = { c: spot.road.c + 3, r: spot.road.r }
  if (dry(5, stray.c, stray.r)) {
    const offRoad = place(state, 'home', stray.c, stray.r)
    assert.equal(offRoad.ok, false)
    if (!offRoad.ok) assert.equal(offRoad.reason, 'road')
  }

  bulldoze(state, spot.road.c, spot.road.r)
  const age = home.age
  tick(state, DAY_MS * 2)
  assert.equal(home.stage, 2)
  assert.equal(home.age, age)
  assert.equal(summarize(state).pop, 0)
})

test('a shop stays shut until people move in', () => {
  const state = newGame(6)
  state.day = 0
  const spot = findSpine(6)
  assert.ok(spot)
  const shopAt = { c: spot.road.c - 1, r: spot.road.r }
  assert.equal(dry(6, shopAt.c, shopAt.r), true)
  place(state, 'road', spot.road.c, spot.road.r)
  place(state, 'power', spot.power.c, spot.power.r)
  place(state, 'shop', shopAt.c, shopAt.r)
  place(state, 'home', spot.home.c, spot.home.r)
  tick(state, DAY_MS)
  const shop = state.cells.find((cell) => cell.kind === 'shop')
  const home = state.cells.find((cell) => cell.kind === 'home')
  assert.equal(home?.stage, 1)
  assert.equal(shop?.stage, 0)
  tick(state, DAY_MS)
  assert.equal(shop?.stage, 1)
  assert.equal(home?.stage, 2)
})

test('broke stalls construction', () => {
  const state = newGame(8)
  state.day = 0
  state.money = 100_000
  const spot = findSpine(8)
  assert.ok(spot)
  place(state, 'road', spot.road.c, spot.road.r)
  place(state, 'power', spot.power.c, spot.power.r)
  place(state, 'home', spot.home.c, spot.home.r)
  state.money = 0
  state.broke = true
  tick(state, DAY_MS * 3)
  const home = state.cells.find((cell) => cell.kind === 'home')
  assert.equal(home?.stage, 0)
})

test('demo harbour block has people and power', () => {
  const demo = createDemo()
  const summary = summarize(demo)
  assert.ok(summary.pop > 40)
  assert.equal(summary.unpowered, 0)
  assert.ok(summary.counts.park >= 1)
  assert.ok(summary.counts.power === 1)
})

test('save parse keeps the city and drops junk', () => {
  const state = newGame(9)
  state.day = 2.2
  const spot = findSpine(9)
  assert.ok(spot)
  place(state, 'road', spot.road.c, spot.road.r)
  place(state, 'park', spot.home.c, spot.home.r)
  const file = serialize(state, { x: 12, y: 40, zoom: 0.9 })
  const loaded = parseSave(file)
  assert.ok(loaded)
  assert.equal(loaded.state.cells.length, 2)
  assert.equal(loaded.state.cells.some((cell) => cell.kind === 'park'), true)
  assert.equal(loaded.cam.zoom, 0.9)
  assert.equal(parseSave({ v: 2 }), null)
  assert.equal(parseSave({ ...file, cells: [{ c: 0, r: 0, kind: 'mall', stage: 1, age: 0 }] }), null)
})
