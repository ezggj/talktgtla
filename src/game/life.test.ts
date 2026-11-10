import assert from 'node:assert/strict'
import test from 'node:test'
import { cityEvent, eventCopy } from './events'
import { regionAt } from './hk-geo'
import { pierById } from './harbour'
import { terrainAt } from './map'
import { parseSave, rejectedSaveKeys, serialize } from './save'
import { rushOf } from './rush'
import { shareCaption } from './share'
import { newGame, place, roadNote, summarize } from './sim'
import { DISTRICTS } from './districts'
import { stationById, STATIONS } from './transit'
import { MAP_SIZE } from './types'
import { stepTraffic, syncTraffic, type Actor } from './traffic'
import { typhoonSignal } from './weather'

function dry(c: number, r: number) {
  const ground = terrainAt(c, r, 1)
  return ground === 'land' || ground === 'shore'
}

test('the star ferry piers sit on opposite shores', () => {
  const island = pierById('central')
  const kowloon = pierById('tst')
  assert.ok(island && kowloon)
  assert.notEqual(regionAt(island.c, island.r), regionAt(kowloon.c, kowloon.r))
  assert.ok(Math.abs(island.r - kowloon.r) + Math.abs(island.c - kowloon.c) >= 3)
})

test('morning crowds a road the transit does not reach, and night lets it go', () => {
  const state = newGame(5, true)
  const cen = stationById('cen')
  assert.ok(cen)
  let spot: { c: number; r: number } | null = null
  for (let r = 4; r < MAP_SIZE - 4 && !spot; r++) {
    for (let c = 4; c < MAP_SIZE - 4 && !spot; c++) {
      if (Math.abs(c - cen.c) + Math.abs(r - cen.r) < 18) continue
      if (!dry(c, r) || !dry(c, r + 1) || !dry(c + 1, r) || !dry(c - 1, r)) continue
      spot = { c, r }
    }
  }
  assert.ok(spot)
  assert.equal(place(state, 'road', spot.c, spot.r).ok, true)
  assert.equal(place(state, 'power', spot.c, spot.r + 1).ok, true)
  assert.equal(place(state, 'home', spot.c + 1, spot.r).ok, true)
  assert.equal(place(state, 'home', spot.c - 1, spot.r).ok, true)
  for (const cell of state.cells) if (cell.kind === 'home') cell.stage = 2
  state.day = 0.25
  state.guide = false
  const morning = summarize(state)
  assert.equal(morning.jam, 'road')
  assert.equal(morning.jamCopy, '條路塞住，加巴士或者港鐵。')
  assert.equal(roadNote(morning, spot.c, spot.r), '條路塞住，加巴士或者港鐵。')
  state.day = 0.9
  const night = summarize(state)
  assert.equal(night.jam, 'none')
  assert.equal(night.night, true)
})

test('both shores without a boat or a linked line jam the crossing', () => {
  const state = newGame(6, true)
  state.day = 0.28
  state.guide = false
  const shores = [stationById('cen'), stationById('tst')]
  for (const station of shores) {
    assert.ok(station)
    let planted = false
    for (let dr = -3; dr <= 3 && !planted; dr++) {
      for (let dc = -3; dc <= 3 && !planted; dc++) {
        const c = station.c + dc
        const r = station.r + dr
        if (!dry(c, r) || !dry(c + 1, r) || !dry(c, r + 1)) continue
        if (!place(state, 'road', c, r).ok) continue
        if (!place(state, 'power', c + 1, r).ok) continue
        if (!place(state, 'home', c, r + 1).ok) continue
        planted = true
      }
    }
    assert.equal(planted, true)
  }
  for (const cell of state.cells) if (cell.kind === 'home') cell.stage = 1
  const jammed = summarize(state)
  assert.equal(jammed.jam, 'harbour')
  assert.match(jammed.jamCopy ?? '', /過海塞車/)
})

test('a living morning has people, buses, a tram and a harbour boat', () => {
  const state = newGame(7)
  state.day = 0.25
  const summary = summarize(state)
  const actors: Actor[] = []
  syncTraffic(actors, state, summary)
  assert.ok(actors.some((actor) => actor.kind === 'person'))
  assert.ok(actors.some((actor) => actor.kind === 'bus'))
  assert.ok(actors.some((actor) => actor.kind === 'tram'))
  assert.ok(actors.some((actor) => actor.kind === 'ferry'))
  const ferry = actors.find((actor) => actor.kind === 'ferry')
  assert.ok(ferry)
  const before = ferry.t
  stepTraffic(actors, state, summary, 0.8)
  assert.ok(ferry.t !== before || ferry.pathI !== 0)
})

test('calendar events are short and say what changed', () => {
  assert.equal(cityEvent(1.2, 0), 'newyear')
  assert.equal(cityEvent(6.4, 0), 'autumn')
  assert.equal(cityEvent(10.2, 0), 'rain')
  assert.equal(cityEvent(13.2, 0), 'burst')
  assert.equal(cityEvent(16.2, 0), 'delay')
  assert.equal(cityEvent(16.2, 8), null)
  assert.match(eventCopy('burst') ?? '', /爆水管/)
  assert.equal(rushOf(0.25), 'morning')
  assert.equal(rushOf(0.7), 'evening')
  assert.equal(rushOf(0.9), 'calm')
})

test('the share line names the city and the population', () => {
  assert.equal(shareCaption({ name: '  海傍  ', pop: 180, day: 2.4, money: 20 }), '海傍，第3日，人口 180。維港兩邊，你起緊。')
  assert.match(shareCaption({ name: '', pop: 12, day: 0, money: 1 }), /^我座城/)
})

test('a wide save keeps its name, and a compact hong kong save is left behind', () => {
  const state = newGame(3, true)
  state.name = '海傍'
  const file = serialize(state, { x: 1, y: 2, zoom: 0.8 })
  const loaded = parseSave(file)
  assert.ok(loaded)
  assert.equal(loaded.state.name, '海傍')
  assert.equal(parseSave({ ...file, v: 3, grid: undefined }), null)
  assert.ok(rejectedSaveKeys().includes('ngo-zo-sing:v3'))
  assert.equal(typhoonSignal(0, 1) >= 0, true)
})

test('harbour stations are a ride apart and do not share a district label', () => {
  const cen = stationById('cen')
  const adm = stationById('adm')
  const wc = stationById('wc')
  const cwb = stationById('cwb')
  const tst = stationById('tst')
  const ymt = stationById('ymt')
  assert.ok(cen && adm && wc && cwb && tst && ymt)
  const gap = (a: { c: number; r: number }, b: { c: number; r: number }) =>
    Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r))
  assert.ok(gap(cen, adm) >= 3)
  assert.ok(gap(adm, wc) >= 3)
  assert.ok(gap(wc, cwb) >= 3)
  assert.ok(gap(tst, ymt) >= 3)
  const stationNames = new Set(STATIONS.map((station) => station.name))
  for (const district of DISTRICTS) {
    assert.equal(stationNames.has(district.name), false)
  }
  for (const name of ['中環', '灣仔', '銅鑼灣', '尖沙咀', '金鐘']) {
    assert.equal(STATIONS.filter((station) => station.name === name).length, 1)
  }
})
