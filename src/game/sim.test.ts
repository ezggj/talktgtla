import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemo } from './demo'
import { terrainAt } from './map'
import { parseSave, serialize } from './save'
import { bulldoze, coach, DAY_MS, newGame, place, summarize, takeMilestones, tick, tileHint } from './sim'
import { COST, MAP_SIZE, START_MONEY } from './types'

function dry(seed: number, c: number, r: number) {
  const ground = terrainAt(c, r, seed)
  return ground === 'land' || ground === 'shore'
}

function findSpine(seed: number) {
  for (let r = 2; r < MAP_SIZE - 2; r++) {
    for (let c = 2; c < MAP_SIZE - 2; c++) {
      const power = { c, r: r + 1 }
      const home = { c: c + 1, r }
      const shop = { c: c - 1, r }
      if (
        dry(seed, c, r) &&
        dry(seed, power.c, power.r) &&
        dry(seed, home.c, home.r) &&
        dry(seed, shop.c, shop.r)
      ) {
        return { road: { c, r }, power, home, shop }
      }
    }
  }
  return null
}

test('placing a road spends treasury and bulldoze refunds a bit', () => {
  const state = newGame(3, true)
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
  const state = newGame(4, true)
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
  const state = newGame(5, true)
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
  assert.equal(home.stage, 1)
  assert.equal(summarize(state).pop, 18)
  const stray = { c: spot.road.c + 3, r: spot.road.r }
  if (dry(5, stray.c, stray.r)) {
    const offRoad = place(state, 'home', stray.c, stray.r)
    assert.equal(offRoad.ok, false)
    if (!offRoad.ok) assert.equal(offRoad.reason, 'road')
  }

  bulldoze(state, spot.road.c, spot.road.r)
  const age = home.age
  tick(state, DAY_MS * 2)
  assert.equal(home.stage, 1)
  assert.equal(home.age, age)
  assert.equal(summarize(state).pop, 0)
})

test('a shop stays shut until people move in', () => {
  const state = newGame(6, true)
  state.day = 0
  const spot = findSpine(6)
  assert.ok(spot)
  assert.ok(spot.shop)
  place(state, 'road', spot.road.c, spot.road.r)
  place(state, 'power', spot.power.c, spot.power.r)
  assert.equal(place(state, 'shop', spot.shop.c, spot.shop.r).ok, true)
  place(state, 'home', spot.home.c, spot.home.r)
  tick(state, DAY_MS)
  const shop = state.cells.find((cell) => cell.kind === 'shop')
  const home = state.cells.find((cell) => cell.kind === 'home')
  assert.equal(home?.stage, 1)
  assert.equal(shop?.stage, 0)
  tick(state, DAY_MS)
  assert.equal(shop?.stage, 1)
  assert.ok((home?.stage ?? 0) >= 1)
})

test('broke stalls construction', () => {
  const state = newGame(8, true)
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

test('a country park refuses a road', () => {
  const state = newGame(11, true)
  let blocked = false
  for (let r = 0; r < MAP_SIZE && !blocked; r++) {
    for (let c = 0; c < MAP_SIZE && !blocked; c++) {
      if (terrainAt(c, r, 11) !== 'parkland') continue
      const result = place(state, 'road', c, r)
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, 'hill')
      blocked = true
    }
  }
  assert.equal(blocked, true)
})

test('demo harbour block has people and power', () => {
  const demo = createDemo()
  const summary = summarize(demo)
  assert.ok(summary.pop > 40)
  assert.equal(summary.unpowered, 0)
  assert.ok(summary.counts.park >= 1)
  assert.ok(summary.counts.power >= 1)
})

test('save parse keeps the city and drops junk', () => {
  const state = newGame(9, true)
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
  assert.equal(parseSave({ v: 1, map: 'square' }), null)
  assert.equal(parseSave({ v: 2 }), null)
  assert.equal(parseSave({ ...file, cells: [{ c: 0, r: 0, kind: 'mall', stage: 1, age: 0 }] }), null)
})

test('a new city explains the first move, then a refused tile says why', () => {
  const state = newGame(7)
  const summary = summarize(state)
  assert.equal(coach(state, summary), '城已經有路有樓。拉條路出去，貼住路起舖或者廠。')
  assert.equal(takeMilestones(state, summary).length, 0)
  let sea: { c: number; r: number } | null = null
  let hill: { c: number; r: number } | null = null
  for (let r = 0; r < MAP_SIZE && (!sea || !hill); r++) {
    for (let c = 0; c < MAP_SIZE && (!sea || !hill); c++) {
      const ground = terrainAt(c, r, 7)
      if (!sea && ground === 'water') sea = { c, r }
      if (!hill && ground === 'parkland') hill = { c, r }
    }
  }
  assert.ok(sea && hill)
  assert.equal(tileHint(state, summary, sea.c, sea.r, 'road'), '呢度係海。')
  assert.equal(tileHint(state, summary, hill.c, hill.r, 'home'), '呢度係山或者郊野公園，起唔到。')
  state.piers = [...state.piers, 'lamma']
  const notes = takeMilestones(state, summarize(state))
  assert.equal(notes[0], '離島船開咗，出到去。')
})
