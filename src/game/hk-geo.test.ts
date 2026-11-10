import assert from 'node:assert/strict'
import test from 'node:test'
import { coastAt, nearestLand, regionAt } from './hk-geo'
import { parseSave } from './save'
import { newGame, place, summarize, tick, DAY_MS } from './sim'
import { stationById, STATIONS } from './transit'

test('Victoria Harbour is water between the island and Kowloon', () => {
  const central = nearestLand(114.158, 22.282, 4)
  const tst = nearestLand(114.172, 22.298, 4)
  const admiralty = stationById('adm')
  const shaTin = stationById('st')
  const tungChung = stationById('tc')
  const loWu = stationById('lw')
  assert.ok(central)
  assert.ok(tst)
  assert.ok(admiralty)
  assert.ok(shaTin)
  assert.ok(tungChung)
  assert.ok(loWu)
  assert.equal(coastAt(central.c, central.r) === 'water', false)
  assert.equal(coastAt(tst.c, tst.r) === 'water', false)
  assert.notEqual(regionAt(central.c, central.r), regionAt(tst.c, tst.r))
  assert.equal(regionAt(shaTin.c, shaTin.r), regionAt(tst.c, tst.r))
  assert.notEqual(regionAt(tungChung.c, tungChung.r), regionAt(tst.c, tst.r))
  const harbour = nearestLand(114.168, 22.29, 0)
  assert.equal(harbour, null)
  assert.ok(STATIONS.length > 24)
})

test('a linked MTR pair raises the daily take and speeds a nearby home', () => {
  const state = newGame(3, true)
  const adm = stationById('adm')
  const wc = stationById('wc')
  assert.ok(adm && wc)
  const road = { c: adm.c + 1, r: adm.r }
  if (coastAt(road.c, road.r) === 'water') road.c = adm.c - 1
  assert.equal(place(state, 'road', road.c, road.r).ok, true)
  const power = { c: road.c, r: road.r + 1 }
  if (coastAt(power.c, power.r) === 'water') power.r = road.r - 1
  assert.equal(place(state, 'power', power.c, power.r).ok, true)
  assert.equal(place(state, 'home', adm.c, adm.r).ok, true)
  state.day = 0
  state.stations = ['adm', 'wc']
  const withRail = summarize(state)
  state.stations = []
  const without = summarize(state)
  assert.equal(withRail.mtrLinked, 2)
  assert.ok(withRail.income > without.income)
  state.stations = ['adm', 'wc']
  state.day = 0
  tick(state, DAY_MS * 3)
  const home = state.cells.find((cell) => cell.kind === 'home')
  assert.ok(home)
  assert.ok(home.stage >= 2)
})

test('old square-grid saves are ignored', () => {
  assert.equal(parseSave({ v: 1, seed: 1, day: 1, money: 10, cells: [], cam: { x: 0, y: 0, zoom: 1 } }), null)
})
