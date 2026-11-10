import { cellKey } from './map'
import { regionAt } from './hk-geo'
import { pierById, runningFerries, runningTramPairs } from './harbour'
import { hash2 } from './rng'
import type { Summary } from './sim'
import { LINE_COLOR, LINES, segmentPairs, stationById, type LineId } from './transit'
import type { GameState } from './types'

export type ActorKind = 'person' | 'bus' | 'tram' | 'train' | 'ferry'

export interface Actor {
  kind: ActorKind
  c: number
  r: number
  nc: number
  nr: number
  t: number
  speed: number
  color: string
  wait: number
  path: { c: number; r: number }[]
  pathI: number
  dir: 1 | -1
  tag: string
}

const SHIRTS = ['#f2efe6', '#e07a4a', '#3d8ea0', '#d4566a', '#efd27a', '#6ea36a']
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export function syncTraffic(actors: Actor[], state: GameState, summary: Summary): void {
  const roads = state.cells.filter((cell) => cell.kind === 'road' && !summary.closed.has(cellKey(cell.c, cell.r)))
  const roadSet = new Set(roads.map((cell) => cellKey(cell.c, cell.r)))
  const night = summary.rush === 'calm' && summary.night
  const peak = summary.rush !== 'calm'
  const crowd = summary.event === 'newyear' || summary.event === 'autumn' ? 1.4 : 1
  const people = roads.length
    ? Math.min(night ? 8 : peak ? 36 : 18, Math.floor(roads.length * (peak ? 2 : 1) * crowd))
    : 0
  const buses =
    summary.signal >= 8 || roads.length < 2 ? 0 : Math.min(peak ? 5 : 3, 1 + Math.floor(roads.length / 5))

  const want: { kind: ActorKind; count: number }[] = [
    { kind: 'person', count: people },
    { kind: 'bus', count: buses },
    { kind: 'tram', count: summary.signal >= 8 ? 0 : Math.min(2, summary.trams > 0 ? 1 + (summary.trams > 2 ? 1 : 0) : 0) },
    { kind: 'train', count: trainCount(state) },
    { kind: 'ferry', count: summary.signal >= 8 ? 0 : runningFerries(state, summary.signal).length },
  ]

  for (const item of want) {
    const have = actors.filter((actor) => actor.kind === item.kind)
    while (actors.filter((actor) => actor.kind === item.kind).length > item.count) {
      const index = actors.findIndex((actor) => actor.kind === item.kind)
      if (index >= 0) actors.splice(index, 1)
    }
    while (actors.filter((actor) => actor.kind === item.kind).length < item.count) {
      const index = have.length + actors.filter((actor) => actor.kind === item.kind).length
      const made = makeActor(item.kind, index, state, summary, roads, roadSet)
      if (!made) break
      actors.push(made)
    }
  }

  for (const actor of actors) {
    if (actor.kind === 'person' || actor.kind === 'bus') {
      if (!roadSet.has(cellKey(actor.c, actor.r))) {
        const home = roads[Math.abs(actor.pathI) % Math.max(1, roads.length)]
        if (!home) continue
        actor.c = home.c
        actor.r = home.r
        actor.nc = home.c
        actor.nr = home.r
        actor.t = 0
        actor.path = []
      }
    }
    if (actor.kind === 'person' && actor.path.length === 0) aimPerson(actor, state, summary, roads)
    if (actor.kind === 'bus' && actor.path.length < 2) aimBus(actor, summary, roads, roadSet)
    actor.tag = summary.rush
    if (actor.kind === 'train') actor.speed = summary.event === 'delay' ? 0.04 : 0.12
    else if (actor.kind === 'bus') actor.speed = summary.event === 'rain' ? 0.16 : 0.34
    else if (actor.kind === 'person') actor.speed = summary.event === 'rain' ? 0.22 : 0.42
  }
}

export function stepTraffic(actors: Actor[], state: GameState, summary: Summary, dtSec: number): void {
  const scale = state.speed === 3 ? 2.1 : 1
  const dt = dtSec * scale
  const roads = new Set(
    state.cells.filter((cell) => cell.kind === 'road' && !summary.closed.has(cellKey(cell.c, cell.r))).map((cell) => cellKey(cell.c, cell.r)),
  )
  for (const actor of actors) {
    if (actor.kind === 'person') stepPerson(actor, dt, roads, summary)
    else stepRoute(actor, dt, summary)
  }
}

function makeActor(
  kind: ActorKind,
  index: number,
  state: GameState,
  summary: Summary,
  roads: { c: number; r: number }[],
  roadSet: Set<string>,
): Actor | null {
  if (kind === 'person' || kind === 'bus') {
    if (!roads.length) return null
    const home = roads[index % roads.length]
    const actor: Actor = {
      kind,
      c: home.c,
      r: home.r,
      nc: home.c,
      nr: home.r,
      t: hash2(home.c, index + 3, state.seed),
      speed: kind === 'bus' ? 0.34 : 0.42,
      color: kind === 'bus' ? '#f4efe4' : SHIRTS[index % SHIRTS.length],
      wait: 0,
      path: [],
      pathI: 0,
      dir: summary.rush === 'evening' ? -1 : 1,
      tag: summary.rush,
    }
    if (kind === 'person') aimPerson(actor, state, summary, roads)
    else aimBus(actor, summary, roads, roadSet)
    return actor
  }
  if (kind === 'ferry') {
    const routes = runningFerries(state, summary.signal)
    const route = routes[index]
    if (!route) return null
    const ordered = route.from.r <= route.to.r ? [route.from, route.to] : [route.to, route.from]
    return phased(routeActor('ferry', ordered, route.kind === 'harbour' ? '#f7f1e6' : '#d5e4ea', 0.11, summary.rush), index)
  }
  if (kind === 'tram') {
    const pairs = runningTramPairs(state, summary.signal)
    if (!pairs.length) return null
    return phased(routeActor('tram', chainPairs(pairs), '#f3efe6', 0.32, summary.rush), index)
  }
  const line = trainLine(state, index)
  if (!line) return null
  const pairs = segmentPairs(state.stations ?? [], line)
  if (!pairs.length) return null
  return phased(
    routeActor('train', chainPairs(pairs), LINE_COLOR[line], summary.event === 'delay' ? 0.04 : 0.12, summary.rush),
    index,
  )
}

function phased(actor: Actor, index: number): Actor {
  actor.t = (index % 3) * 0.28
  return actor
}

function routeActor(
  kind: ActorKind,
  path: { c: number; r: number }[],
  color: string,
  speed: number,
  rush: string,
): Actor {
  const a = path[0]
  const b = path[Math.min(1, path.length - 1)]
  return {
    kind,
    c: a.c,
    r: a.r,
    nc: b.c,
    nr: b.r,
    t: 0,
    speed,
    color,
    wait: 0,
    path,
    pathI: 0,
    dir: rush === 'evening' ? -1 : 1,
    tag: rush,
  }
}

function aimPerson(actor: Actor, state: GameState, summary: Summary, roads: { c: number; r: number }[]) {
  const island = shoreRegion('cen')
  const kowloon = shoreRegion('tst')
  const here = regionAt(actor.c, actor.r)
  let dest = roads[Math.abs(Math.floor(actor.t * 10) + actor.pathI) % roads.length]
  if (summary.event === 'autumn') {
    const park = state.cells.find((cell) => cell.kind === 'park')
    dest = (park && nearestRoad(park, roads)) || dest
  } else if (summary.event === 'newyear') {
    const shops = state.cells.filter((cell) => cell.kind === 'shop')
    const shop = shops.length ? shops[actor.pathI % shops.length] : null
    dest = (shop && nearestRoad(shop, roads)) || dest
  } else if (summary.rush === 'morning' && here === kowloon) {
    dest = nearestRoad(pierById('tst') ?? stationById('tst')!, roads) ?? dest
  } else if (summary.rush === 'morning' && here === island) {
    const shops = state.cells.filter((cell) => cell.kind === 'shop' && regionAt(cell.c, cell.r) === island)
    const shop = shops.length ? shops[actor.pathI % shops.length] : stationById('cen')
    dest = (shop && nearestRoad(shop, roads)) || dest
  } else if (summary.rush === 'evening' && here === island) {
    dest = nearestRoad(pierById('central') ?? stationById('cen')!, roads) ?? dest
  } else if (summary.rush === 'evening' && here === kowloon) {
    const homes = state.cells.filter((cell) => cell.kind === 'home' && regionAt(cell.c, cell.r) === kowloon)
    const home = homes.length ? homes[actor.pathI % homes.length] : null
    dest = (home && nearestRoad(home, roads)) || dest
  } else if (state.stops.length && actor.pathI % 3 === 0) {
    dest = state.stops[actor.pathI % state.stops.length]
  }
  actor.path = [dest]
}

function aimBus(
  actor: Actor,
  summary: Summary,
  roads: { c: number; r: number }[],
  roadSet: Set<string>,
) {
  const mine = roads.filter((cell) => regionAt(cell.c, cell.r) === regionAt(actor.c, actor.r))
  const pool = mine.length > 1 ? mine : roads
  const south = pool.reduce((best, cell) => (cell.r > best.r ? cell : best), pool[0])
  const north = pool.reduce((best, cell) => (cell.r < best.r ? cell : best), pool[0])
  const goal = summary.rush === 'evening' ? north : south
  const from = { c: actor.c, r: actor.r }
  actor.path = routeBetween(from, goal, roadSet)
  actor.pathI = 0
  actor.t = 0
}

function stepPerson(actor: Actor, dt: number, roads: Set<string>, summary: Summary) {
  if (actor.wait > 0) {
    actor.wait -= dt
    return
  }
  const dest = actor.path[0] ?? { c: actor.c, r: actor.r }
  if (actor.c === actor.nc && actor.r === actor.nr) pickPerson(actor, roads, dest)
  const jammed = summary.jamTiles.has(cellKey(actor.nc, actor.nr)) || summary.jamTiles.has(cellKey(actor.c, actor.r))
  const speed = (jammed ? actor.speed * 0.45 : actor.speed) * (summary.night ? 0.7 : 1)
  actor.t += dt * speed
  if (actor.t < 1) return
  actor.c = actor.nc
  actor.r = actor.nr
  actor.t = 0
  if (actor.c === dest.c && actor.r === dest.r) {
    actor.wait = summary.event === 'autumn' ? 2.4 : 1.3
    actor.path = []
    return
  }
  pickPerson(actor, roads, dest)
}

function pickPerson(actor: Actor, roads: Set<string>, dest: { c: number; r: number }) {
  const options = DIRS.map(([dc, dr]) => ({ c: actor.c + dc, r: actor.r + dr })).filter((cell) =>
    roads.has(cellKey(cell.c, cell.r)),
  )
  if (!options.length) {
    actor.nc = actor.c
    actor.nr = actor.r
    actor.wait = 0.6
    return
  }
  options.sort((a, b) => dist(a, dest) - dist(b, dest) || a.c - b.c || a.r - b.r)
  const best = options[0]
  if (dist(best, dest) > dist(actor, dest)) {
    actor.wait = 0.8
    actor.path = []
    actor.nc = actor.c
    actor.nr = actor.r
    return
  }
  actor.nc = best.c
  actor.nr = best.r
}

function stepRoute(actor: Actor, dt: number, summary: Summary) {
  if (actor.wait > 0) {
    actor.wait -= dt
    return
  }
  if (actor.path.length < 2) return
  let next = actor.pathI + actor.dir
  if (next < 0 || next >= actor.path.length) {
    actor.dir = actor.dir === 1 ? -1 : 1
    next = actor.pathI + actor.dir
  }
  if (next < 0 || next >= actor.path.length) return
  const a = actor.path[actor.pathI]
  const b = actor.path[next]
  actor.c = a.c
  actor.r = a.r
  actor.nc = b.c
  actor.nr = b.r
  const jammed = actor.kind === 'bus' && (summary.jamTiles.has(cellKey(a.c, a.r)) || summary.jamTiles.has(cellKey(b.c, b.r)))
  actor.t += dt * (jammed ? actor.speed * 0.28 : actor.speed)
  if (actor.t < 1) return
  actor.t = 0
  actor.pathI = next
  actor.wait = actor.kind === 'ferry' ? 0.4 : 0.22
}

function trainCount(state: GameState): number {
  let count = 0
  for (const line of LINES) {
    if (segmentPairs(state.stations ?? [], line.id).length) count += 1
  }
  return count
}

function trainLine(state: GameState, index: number): LineId | null {
  const lines = LINES.filter((line) => segmentPairs(state.stations ?? [], line.id).length)
  return lines[index]?.id ?? null
}

function chainPairs(pairs: [{ c: number; r: number }, { c: number; r: number }][]): { c: number; r: number }[] {
  if (!pairs.length) return []
  const path = [pairs[0][0], pairs[0][1]]
  for (let i = 1; i < pairs.length; i++) {
    const next = pairs[i][1]
    const last = path[path.length - 1]
    if (last.c === pairs[i][0].c && last.r === pairs[i][0].r) path.push(next)
    else path.push(pairs[i][0], next)
  }
  return path
}

function nearestRoad(
  spot: { c: number; r: number },
  roads: { c: number; r: number }[],
): { c: number; r: number } | null {
  let best: { c: number; r: number } | null = null
  let bestD = 9
  for (const road of roads) {
    const d = Math.max(Math.abs(road.c - spot.c), Math.abs(road.r - spot.r))
    if (d < bestD) {
      bestD = d
      best = road
    }
  }
  return best
}

function shoreRegion(id: 'cen' | 'tst'): number {
  const station = stationById(id)
  if (!station) return -1
  return regionAt(station.c, station.r)
}

function dist(a: { c: number; r: number }, b: { c: number; r: number }): number {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r)
}

function routeBetween(
  from: { c: number; r: number },
  to: { c: number; r: number },
  open: Set<string>,
): { c: number; r: number }[] {
  if (from.c === to.c && from.r === to.r) return [from, from]
  const queue = [from]
  const prev = new Map<string, string>([[cellKey(from.c, from.r), '']])
  let guard = 0
  while (queue.length && guard < 400) {
    guard += 1
    const cur = queue.shift()!
    for (const [dc, dr] of DIRS) {
      const next = { c: cur.c + dc, r: cur.r + dr }
      const key = cellKey(next.c, next.r)
      if (!open.has(key) || prev.has(key)) continue
      prev.set(key, cellKey(cur.c, cur.r))
      if (next.c === to.c && next.r === to.r) {
        const path = [next]
        let cursor = cellKey(cur.c, cur.r)
        while (cursor) {
          const [c, r] = cursor.split(',').map(Number)
          path.push({ c, r })
          cursor = prev.get(cursor) ?? ''
        }
        return path.reverse()
      }
      queue.push(next)
    }
  }
  return [from, to]
}
