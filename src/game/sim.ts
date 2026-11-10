import { cellKey, terrainAt } from './map'
import { transitFx } from './transit'
import {
  COST,
  DAY_MS,
  FACTORY_INCOME,
  FACTORY_JOBS,
  HOME_POP,
  HOME_TAX,
  MAP_SIZE,
  POWER_RANGE,
  REFUND_RATE,
  SHOP_INCOME,
  SHOP_JOBS,
  START_MONEY,
  UPKEEP,
  type BuildKind,
  type Cell,
  type Demand,
  type GameState,
  type Tool,
} from './types'

/**
 * v1 need: electricity runs along roads from a 電箱.
 * Buildings beside a powered road (or beside the box) grow.
 * Parks grow on their own and hurry nearby homes.
 *
 * Not in this build, left as later ideas only: bus lines, rail, storm
 * signals, district votes, festivals, headlines, a market, a desktop shell.
 */

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export interface Summary {
  pop: number
  jobs: number
  served: Set<string>
  poweredRoads: Set<string>
  wiredRoads: Set<string>
  unpowered: number
  offRoad: number
  tooFar: number
  unconnected: number
  powerTouchesRoad: boolean
  demand: { home: Demand; shop: Demand; factory: Demand }
  income: number
  upkeep: number
  nearPark: Set<string>
  counts: Record<BuildKind, number>
  transitTiles: Set<string>
  mtrLinked: number
  busLinked: number
}

export type PlaceReason = 'water' | 'occupied' | 'money' | 'empty' | 'edge' | 'road'

export type PlaceResult = { ok: true; cell: Cell } | { ok: false; reason: PlaceReason }

export function newGame(seed = Math.floor(Math.random() * 1_000_000_000)): GameState {
  return {
    seed,
    day: 0.34,
    money: START_MONEY,
    cells: [],
    speed: 1,
    paused: false,
    lastDelta: 0,
    broke: false,
    stations: [],
    stops: [],
  }
}

export function tick(state: GameState, dtMs: number): Summary {
  if (!state.paused && state.speed > 0 && dtMs > 0) {
    const prev = Math.floor(state.day)
    const advance = Math.min(8, (dtMs * state.speed) / DAY_MS)
    state.day += advance
    const next = Math.floor(state.day)
    for (let d = prev; d < next; d++) endOfDay(state)
  }
  return summarize(state)
}

export function place(state: GameState, tool: Tool, c: number, r: number): PlaceResult {
  if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return { ok: false, reason: 'edge' }
  if (tool === 'bulldoze') return bulldoze(state, c, r)
  if (tool === 'mtr' || tool === 'bus') return { ok: false, reason: 'edge' }
  if (terrainAt(c, r, state.seed) === 'water') return { ok: false, reason: 'water' }
  if (cellAt(state, c, r)) return { ok: false, reason: 'occupied' }
  if (tool !== 'road' && !neighbors(c, r).some((n) => cellAt(state, n.c, n.r)?.kind === 'road')) {
    return { ok: false, reason: 'road' }
  }
  const cost = COST[tool]
  if (state.money < cost) return { ok: false, reason: 'money' }
  state.money -= cost
  const cell: Cell = {
    c,
    r,
    kind: tool,
    stage: tool === 'road' || tool === 'power' ? 1 : 0,
    age: 0,
  }
  state.cells.push(cell)
  if (state.money > 0) state.broke = false
  return { ok: true, cell }
}

export function bulldoze(state: GameState, c: number, r: number): PlaceResult {
  const index = state.cells.findIndex((cell) => cell.c === c && cell.r === r)
  if (index < 0) return { ok: false, reason: 'empty' }
  const [cell] = state.cells.splice(index, 1)
  state.money += Math.round(COST[cell.kind] * REFUND_RATE)
  return { ok: true, cell }
}

export function summarize(state: GameState): Summary {
  const counts: Record<BuildKind, number> = {
    road: 0,
    home: 0,
    shop: 0,
    factory: 0,
    park: 0,
    power: 0,
  }
  const byKey = new Map<string, Cell>()
  for (const cell of state.cells) {
    counts[cell.kind] += 1
    byKey.set(cellKey(cell.c, cell.r), cell)
  }

  const powers = state.cells.filter((cell) => cell.kind === 'power')
  const powerTouchesRoad = powers.some((cell) => neighbors(cell.c, cell.r).some((n) => byKey.get(cellKey(n.c, n.r))?.kind === 'road'))

  const wiredDist = new Map<string, number>()
  const queue: { c: number; r: number; d: number }[] = []
  for (const power of powers) {
    for (const n of neighbors(power.c, power.r)) {
      const key = cellKey(n.c, n.r)
      if (byKey.get(key)?.kind !== 'road' || wiredDist.has(key)) continue
      wiredDist.set(key, 1)
      queue.push({ c: n.c, r: n.r, d: 1 })
    }
  }
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    for (const n of neighbors(cur.c, cur.r)) {
      const key = cellKey(n.c, n.r)
      if (byKey.get(key)?.kind !== 'road' || wiredDist.has(key)) continue
      wiredDist.set(key, cur.d + 1)
      queue.push({ c: n.c, r: n.r, d: cur.d + 1 })
    }
  }

  const poweredRoads = new Set<string>()
  const wiredRoads = new Set<string>()
  for (const [key, dist] of wiredDist) {
    wiredRoads.add(key)
    if (dist <= POWER_RANGE) poweredRoads.add(key)
  }

  const nearPark = new Set<string>()
  for (const cell of state.cells) {
    if (cell.kind !== 'park') continue
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) nearPark.add(cellKey(cell.c + dc, cell.r + dr))
    }
  }

  const transit = transitFx(state)
  const served = new Set<string>()
  let pop = 0
  let jobs = 0
  let income = 0
  let upkeep = 0
  let unpowered = 0
  let offRoad = 0
  let tooFar = 0
  let unconnected = 0

  for (const cell of state.cells) {
    if (cell.kind === 'road' || cell.kind === 'power') {
      upkeep += UPKEEP[cell.kind]
      continue
    }
    const around = neighbors(cell.c, cell.r)
    const besidePower = around.some((n) => byKey.get(cellKey(n.c, n.r))?.kind === 'power')
    const besidePoweredRoad = around.some((n) => poweredRoads.has(cellKey(n.c, n.r)))
    const besideWiredRoad = around.some((n) => wiredRoads.has(cellKey(n.c, n.r)))
    const besideRoad = around.some((n) => byKey.get(cellKey(n.c, n.r))?.kind === 'road')
    const on = cell.kind === 'park' || besidePower || besidePoweredRoad
    if (on) served.add(cellKey(cell.c, cell.r))

    if (cell.kind !== 'park') {
      if (!besideRoad && !besidePower) offRoad += 1
      else if (!on && besideWiredRoad) tooFar += 1
      else if (!on) unconnected += 1
      if (!on) unpowered += 1
    }

    if (cell.stage > 0) upkeep += UPKEEP[cell.kind]
    if (!on || cell.stage <= 0) continue
    const boosted = transit.tiles.has(cellKey(cell.c, cell.r))
    if (cell.kind === 'home') {
      const people = HOME_POP[cell.stage] ?? 0
      pop += boosted ? Math.round(people * 1.35) : people
      income += HOME_TAX[cell.stage] ?? 0
    } else if (cell.kind === 'shop') {
      jobs += SHOP_JOBS[cell.stage] ?? 0
      income += SHOP_INCOME[cell.stage] ?? 0
    } else if (cell.kind === 'factory') {
      jobs += FACTORY_JOBS[cell.stage] ?? 0
      income += FACTORY_INCOME[cell.stage] ?? 0
    }
  }

  return {
    pop,
    jobs,
    served,
    poweredRoads,
    wiredRoads,
    unpowered,
    offRoad,
    tooFar,
    unconnected,
    powerTouchesRoad,
    demand: {
      home: band(jobs - pop + 20, 8, -30),
      shop: band(pop - counts.shop * 22, 8, -18),
      factory: band(pop * 0.55 - factoryJobs(state, served), 10, -16),
    },
    income: income + transit.fare,
    upkeep,
    nearPark,
    counts,
    transitTiles: transit.tiles,
    mtrLinked: transit.linked,
    busLinked: transit.busLinked,
  }
}

export function coach(state: GameState, summary: Summary): string {
  if (state.broke) return '庫房見底。拆走閒路，等住人交稅。'
  if (summary.counts.road === 0) return '撳「路」，再撳塊地起。'
  if (summary.counts.power === 0) return '電箱貼住條路，樓先有電。'
  if (!summary.powerTouchesRoad) return '電箱貼住條路，先送得到電。'
  if (summary.counts.home === 0) return '而家起住宅，人會慢慢搬入嚟。'
  if (summary.offRoad > 0) return '有樓未貼路。搬去路旁邊先有電。'
  if (summary.tooFar > 0) return '電箱送得唔夠遠，近啲再放一個。'
  if (summary.unconnected > 0) return '有樓未駁到電。路要連住電箱。'
  if (summary.counts.shop === 0 && summary.pop >= 10) return '人多咗，可以開街舖。'
  if (summary.counts.park === 0 && summary.counts.home > 0) return '休憩附近嘅住宅起得快啲。'
  if (summary.counts.factory === 0 && summary.pop >= 18) return '想多啲職位，起工業。'
  if (summary.mtrLinked < 2) return '沿光點起港鐵，兩個站一通，附近樓起得快啲。'
  if (summary.busLinked < 2) return '喺路上面撳巴士站，站要駁到同一條路。'
  return '樓會慢慢起高。想睇快啲，撳「快」。'
}

export function dayNumber(day: number): number {
  return Math.floor(day) + 1
}

export function dayPart(day: number): string {
  const t = ((day % 1) + 1) % 1
  if (t < 0.18) return '凌晨'
  if (t < 0.3) return '朝早'
  if (t < 0.62) return '日頭'
  if (t < 0.72) return '下晝'
  if (t < 0.8) return '黃昏'
  return '夜晚'
}

export function sunAmount(day: number): number {
  const t = ((day % 1) + 1) % 1
  if (t < 0.18) return 0
  if (t < 0.3) return smooth((t - 0.18) / 0.12)
  if (t < 0.66) return 1
  if (t < 0.8) return 1 - smooth((t - 0.66) / 0.14)
  return 0
}

export function isRaining(day: number, seed: number): boolean {
  const block = Math.floor(day / 3)
  const h = fraction(block, seed)
  if (h > 0.28) return false
  const phase = (((day / 3) % 1) + 1) % 1
  return phase > 0.2 && phase < 0.75
}

export function reasonCopy(reason: PlaceReason): string | null {
  if (reason === 'water') return '呢度係海。'
  if (reason === 'occupied') return '呢度有嘢。'
  if (reason === 'money') return '庫房唔夠。'
  if (reason === 'edge') return '出咗界。'
  if (reason === 'road') return '要貼住條路。'
  return null
}

function endOfDay(state: GameState) {
  const before = summarize(state)
  if (!state.broke) {
    for (const cell of state.cells) {
      if (cell.kind === 'road' || cell.kind === 'power') continue
      const on = before.served.has(cellKey(cell.c, cell.r))
      grow(cell, on, before)
    }
  }
  const after = summarize(state)
  const delta = after.income - after.upkeep
  state.money += delta
  if (state.money < 0) state.money = 0
  state.lastDelta = delta
  state.broke = state.money === 0 && delta < 0
}

function grow(cell: Cell, on: boolean, summary: Summary) {
  if (!on) return
  cell.age += 1
  const near =
    summary.transitTiles.has(cellKey(cell.c, cell.r)) ||
    (cell.kind === 'home' && summary.nearPark.has(cellKey(cell.c, cell.r)))
  if (cell.stage === 0) {
    if (cell.kind === 'shop' && summary.pop < 10) return
    if (cell.kind === 'factory' && summary.pop < 18) return
    if (cell.kind === 'park') {
      cell.stage = 1
      return
    }
    cell.stage = 1
    return
  }
  const pace = near ? 1 : 2
  if (cell.age % pace !== 0) return
  if (cell.stage >= 3) return
  if (cell.kind === 'park') {
    cell.stage += 1
    return
  }
  const demand =
    cell.kind === 'home' ? summary.demand.home : cell.kind === 'shop' ? summary.demand.shop : summary.demand.factory
  if (demand === 'full') return
  if (cell.stage >= 2 && demand !== 'want') return
  cell.stage += 1
}

function factoryJobs(state: GameState, served: Set<string>): number {
  let jobs = 0
  for (const cell of state.cells) {
    if (cell.kind !== 'factory' || cell.stage <= 0) continue
    if (!served.has(cellKey(cell.c, cell.r))) continue
    jobs += FACTORY_JOBS[cell.stage] ?? 0
  }
  return jobs
}

function band(score: number, wantAbove: number, fullBelow: number): Demand {
  if (score > wantAbove) return 'want'
  if (score < fullBelow) return 'full'
  return 'ok'
}

function cellAt(state: GameState, c: number, r: number): Cell | undefined {
  return state.cells.find((cell) => cell.c === c && cell.r === r)
}

function neighbors(c: number, r: number): { c: number; r: number }[] {
  return DIRS.map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

function fraction(block: number, seed: number): number {
  let n = Math.imul(block | 0, 2246822519) ^ Math.imul(seed | 0, 3266489917)
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 668265263)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export { DAY_MS }
