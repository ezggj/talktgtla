import { cityEvent, closedRoads, eventCopy, eventShopMul } from './events'
import { harbourFx, pierById } from './harbour'
import { regionAt } from './hk-geo'
import { cellKey, terrainAt } from './map'
import { jamCopy, jamShopMul, nightOf, rushBonus, rushOf, type JamKind, type Rush } from './rush'
import { linkedIds, stationById, transitFx } from './transit'
import { seedLivingCity } from './starter'
import { shopFactor, signalCopy, typhoonSignal } from './weather'
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
 * Rush hour, short city events, and transit sit on top of that loop.
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
  signal: 0 | 1 | 3 | 8
  ferries: number
  trams: number
  census: Cell[]
  rush: Rush
  night: boolean
  jam: JamKind
  jamCopy: string | null
  jamTiles: Set<string>
  harbourTiles: Set<string>
  event: ReturnType<typeof cityEvent>
  eventCopy: string | null
  closed: Set<string>
}

export type PlaceReason = 'water' | 'occupied' | 'money' | 'empty' | 'edge' | 'road' | 'hill'

export type PlaceResult = { ok: true; cell: Cell } | { ok: false; reason: PlaceReason }

export function newGame(seed = Math.floor(Math.random() * 1_000_000_000), bare = false): GameState {
  const state: GameState = {
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
    piers: [],
    trams: [],
    name: '我座城',
    guide: !bare,
    milestones: [],
    sawEight: false,
  }
  if (!bare) seedLivingCity(state)
  return state
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
  if (tool === 'mtr' || tool === 'bus' || tool === 'ferry' || tool === 'tram') return { ok: false, reason: 'edge' }
  const ground = terrainAt(c, r, state.seed)
  if (ground === 'water') return { ok: false, reason: 'water' }
  if (ground === 'parkland' || ground === 'slope') return { ok: false, reason: 'hill' }
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
  state.guide = false
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

  const signal = typhoonSignal(state.day, state.seed)
  const transit = transitFx(state, signal)
  const harbour = harbourFx(state, signal)
  const served = new Set<string>()
  let pop = 0
  let jobs = 0
  let income = 0
  let shopIncome = 0
  let upkeep = 0
  const lived: { c: number; r: number; pop: number; region: number }[] = []
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
    const boosted = transit.tiles.has(cellKey(cell.c, cell.r)) || harbour.tiles.has(cellKey(cell.c, cell.r))
    if (cell.kind === 'home') {
      const people = HOME_POP[cell.stage] ?? 0
      lived.push({ c: cell.c, r: cell.r, pop: people, region: regionAt(cell.c, cell.r) })
      pop += boosted ? Math.round(people * 1.35) : people
      income += HOME_TAX[cell.stage] ?? 0
    } else if (cell.kind === 'shop') {
      jobs += SHOP_JOBS[cell.stage] ?? 0
      shopIncome += SHOP_INCOME[cell.stage] ?? 0
    } else if (cell.kind === 'factory') {
      jobs += FACTORY_JOBS[cell.stage] ?? 0
      income += FACTORY_INCOME[cell.stage] ?? 0
    }
  }

  const event = cityEvent(state.day, signal)
  const rush = rushOf(state.day)
  const pressure = assessPressure({
    signal,
    event,
    rush,
    lived,
    roads: state.cells.filter((cell) => cell.kind === 'road'),
    transitTiles: transit.tiles,
    busLinked: signal >= 8 ? 0 : transit.busLinked,
    crossing: harbourCrossing(state, signal, event, transit.crossHarbour),
    stops: state.stops ?? [],
  })
  const fareCut = event === 'delay' ? 0.45 : 1
  const transitOn = transit.linked + (signal >= 8 ? 0 : transit.busLinked) + harbour.trams + harbour.ferries > 0
  const flow =
    income +
    Math.round(shopIncome * shopFactor(signal) * eventShopMul(event) * jamShopMul(pressure.jam)) +
    Math.round((transit.fare + harbour.fare) * fareCut) +
    rushBonus(pop, rush, pressure.jam, transitOn)

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
    income: flow,
    upkeep,
    nearPark,
    counts,
    transitTiles: new Set([...transit.tiles, ...harbour.tiles]),
    mtrLinked: transit.linked,
    busLinked: signal >= 8 ? 0 : transit.busLinked,
    signal,
    ferries: harbour.ferries,
    trams: harbour.trams,
    census: state.cells,
    rush,
    night: nightOf(state.day),
    jam: pressure.jam,
    jamCopy: jamCopy(pressure.jam),
    jamTiles: pressure.jamTiles,
    harbourTiles: pressure.harbourTiles,
    event,
    eventCopy: eventCopy(event),
    closed: closedRoads(state.day, state.seed, event, state.cells),
  }
}

function harbourCrossing(
  state: GameState,
  signal: Summary['signal'],
  event: ReturnType<typeof cityEvent>,
  busCross: boolean,
): boolean {
  if (signal >= 8) return false
  const ferry = (state.piers ?? []).includes('central') && (state.piers ?? []).includes('tst')
  if (ferry) return true
  if (busCross) return true
  if (event === 'delay') return false
  const island = regionAt(stationById('cen')?.c ?? -1, stationById('cen')?.r ?? -1)
  const kowloon = regionAt(stationById('tst')?.c ?? -1, stationById('tst')?.r ?? -1)
  let onIsland = false
  let onKowloon = false
  for (const id of linkedIds(state.stations ?? [])) {
    const station = stationById(id)
    if (!station) continue
    const region = regionAt(station.c, station.r)
    if (region === island) onIsland = true
    else if (region === kowloon) onKowloon = true
  }
  return onIsland && onKowloon
}

function assessPressure(input: {
  signal: Summary['signal']
  event: ReturnType<typeof cityEvent>
  rush: Rush
  lived: { c: number; r: number; pop: number; region: number }[]
  roads: { c: number; r: number }[]
  transitTiles: Set<string>
  busLinked: number
  crossing: boolean
  stops: { c: number; r: number }[]
}): { jam: JamKind; jamTiles: Set<string>; harbourTiles: Set<string> } {
  const jamTiles = new Set<string>()
  const harbourTiles = new Set<string>()
  const peak = input.rush !== 'calm' && input.signal < 8
  const island = regionAt(stationById('cen')?.c ?? -1, stationById('cen')?.r ?? -1)
  const kowloon = regionAt(stationById('tst')?.c ?? -1, stationById('tst')?.r ?? -1)
  let islandPop = 0
  let kowloonPop = 0
  for (const home of input.lived) {
    if (home.region === island) islandPop += home.pop
    else if (home.region === kowloon) kowloonPop += home.pop
  }
  const bothShores = islandPop >= 18 && kowloonPop >= 18
  const harbourJam = peak && bothShores && !input.crossing
  const piers = [pierById('central'), pierById('tst')].filter((pier) => pier)
  if (peak) {
    for (const road of input.roads) {
      let local = 0
      for (const home of input.lived) {
        if (Math.max(Math.abs(home.c - road.c), Math.abs(home.r - road.r)) <= 3) local += home.pop
      }
      const key = cellKey(road.c, road.r)
      const nearStop =
        input.busLinked >= 2 &&
        input.stops.some((stop) => Math.max(Math.abs(stop.c - road.c), Math.abs(stop.r - road.r)) <= 4)
      const nearPier = piers.some(
        (pier) => pier && Math.max(Math.abs(pier.c - road.c), Math.abs(pier.r - road.r)) <= 3,
      )
      const mtr = input.event !== 'delay' && input.transitTiles.has(key)
      const relieved = mtr || (nearStop && local < 110) || (nearPier && input.crossing && local < 110)
      if (local >= 70 && !relieved) jamTiles.add(key)
    }
  }
  if (harbourJam) {
    for (const road of input.roads) {
      if (!piers.some((pier) => pier && Math.max(Math.abs(pier.c - road.c), Math.abs(pier.r - road.r)) <= 4)) continue
      const key = cellKey(road.c, road.r)
      harbourTiles.add(key)
      jamTiles.add(key)
    }
  }
  let jam: JamKind = 'none'
  if (harbourJam) jam = 'harbour'
  else if (jamTiles.size && input.busLinked >= 2) jam = 'bus'
  else if (jamTiles.size) jam = 'road'
  return { jam, jamTiles, harbourTiles }
}

export function coach(state: GameState, summary: Summary): string {
  const storm = signalCopy(summary.signal)
  if (storm && summary.signal >= 8) return storm
  if (state.guide) return '城已經有路有樓。拉條路出去，貼住路起舖或者廠。'
  if (summary.eventCopy) return summary.eventCopy
  if (summary.jamCopy) return summary.jamCopy
  if (storm && summary.signal >= 3) return storm
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
  const signal = typhoonSignal(day, seed)
  if (signal >= 1) return true
  if (cityEvent(day, signal) === 'rain') return true
  const block = Math.floor(day / 3)
  const h = fraction(block, seed)
  if (h > 0.28) return false
  const phase = (((day / 3) % 1) + 1) % 1
  return phase > 0.2 && phase < 0.75
}

export function roadNote(summary: Summary, c: number, r: number): string | null {
  const key = cellKey(c, r)
  if (summary.closed.has(key)) return '呢段爆咗水管，車行唔到。'
  if (summary.harbourTiles.has(key)) return '過海塞車，開船或者駁過海綫。'
  if (!summary.jamTiles.has(key)) return null
  if (summary.jam === 'bus') return '巴士掛卡，條路疏咗先順。'
  return '條路塞住，加巴士或者港鐵。'
}

export function tileHint(state: GameState, summary: Summary, c: number, r: number, tool: Tool): string | null {
  const building = cellAt(state, c, r)
  if (building && building.kind !== 'road' && building.kind !== 'power' && building.kind !== 'park') {
    const key = cellKey(c, r)
    if (!summary.served.has(key)) {
      const besideRoad = neighbors(c, r).some((n) => cellAt(state, n.c, n.r)?.kind === 'road')
      return besideRoad ? '未有電，所以停咗。' : '未貼路，所以停咗。'
    }
    if (
      building.kind === 'home' &&
      nearbyJobs(building, summary) < 8 &&
      !summary.transitTiles.has(key)
    ) {
      return '附近冇工做，住宅唔會再高。'
    }
    if (building.kind === 'home' && building.stage >= 2 && !summary.nearPark.has(key)) return '想有個休憩，先會再高。'
    if (building.kind === 'shop' && nearbyPop(building, summary) < 12) return '附近未有人住，舖未開得。'
    if (building.kind === 'factory' && nearbyPop(building, summary) < 16) return '請唔到人，廠未開得。'
  }
  if (building?.kind === 'road') {
    const note = roadNote(summary, c, r)
    if (note) return note
  }
  if (tool === 'mtr') return '撳光點起站。兩個站一通先有車費。'
  if (tool === 'ferry') return '撳碼頭。中環同尖沙咀接通就有維港船。'
  if (tool === 'tram') return '沿港島北岸撳站，兩站一通先有電車。'
  if (tool === 'bus') return '巴士站要落喺路上，同一條路先算一條綫。'
  if (tool === 'bulldoze') return null
  const ground = terrainAt(c, r, state.seed)
  if (ground === 'water') return '呢度係海。'
  if (ground === 'parkland' || ground === 'slope') return '呢度係山或者郊野公園，起唔到。'
  if (building) return '呢度有嘢。'
  if (tool !== 'road' && !neighbors(c, r).some((n) => cellAt(state, n.c, n.r)?.kind === 'road')) {
    return '要貼住條路。'
  }
  if (state.money < COST[tool]) return '庫房唔夠。'
  return null
}

export function takeMilestones(state: GameState, summary: Summary): string[] {
  if (!state.milestones) state.milestones = []
  const have = new Set(state.milestones)
  const fresh: string[] = []
  const grant = (id: string, message: string) => {
    if (have.has(id)) return
    have.add(id)
    state.milestones.push(id)
    fresh.push(message)
  }
  if (summary.signal === 8) state.sawEight = true
  if (state.sawEight && summary.signal < 8) grant('typhoon', '八號風球過咗，大家返工。')
  if (summary.pop >= 200) grant('pop', '人口過咗二百，城旺咗。')
  if (summary.ferries >= 2) grant('ferry', '離島船開咗，出到去。')
  if ((state.trams ?? []).includes('t-cwb')) grant('tram', '電車去到銅鑼灣。')
  return fresh
}

export function reasonCopy(reason: PlaceReason): string | null {
  if (reason === 'water') return '呢度係海。'
  if (reason === 'occupied') return '呢度有嘢。'
  if (reason === 'money') return '庫房唔夠。'
  if (reason === 'edge') return '出咗界。'
  if (reason === 'road') return '要貼住條路。'
  if (reason === 'hill') return '呢度係山或者郊野公園，起唔到。'
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
    if (cell.kind === 'shop' && nearbyPop(cell, summary) < 12) return
    if (cell.kind === 'factory' && nearbyPop(cell, summary) < 16) return
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
  const besideJam = neighbors(cell.c, cell.r).some((n) => summary.jamTiles.has(cellKey(n.c, n.r)))
  const onTransit = summary.transitTiles.has(cellKey(cell.c, cell.r))
  if (besideJam && !onTransit && (cell.kind === 'home' || cell.kind === 'shop')) return
  if (
    cell.kind === 'home' &&
    nearbyJobs(cell, summary) < 8 &&
    !summary.transitTiles.has(cellKey(cell.c, cell.r))
  ) {
    return
  }
  if (cell.kind === 'home' && cell.stage >= 2 && !summary.nearPark.has(cellKey(cell.c, cell.r))) return
  if (cell.kind === 'shop' && nearbyPop(cell, summary) < 12 * cell.stage) return
  if (cell.kind === 'factory' && nearbyPop(cell, summary) < 16) return
  const demand =
    cell.kind === 'home' ? summary.demand.home : cell.kind === 'shop' ? summary.demand.shop : summary.demand.factory
  if (demand === 'full') return
  if (cell.stage >= 2 && demand !== 'want') return
  cell.stage += 1
}

function nearbyPop(cell: Cell, summary: Summary): number {
  return nearbyKind(cell, summary, 'home', 5)
}

function nearbyJobs(cell: Cell, summary: Summary): number {
  return nearbyKind(cell, summary, 'shop', 6) + nearbyKind(cell, summary, 'factory', 6)
}

function nearbyKind(cell: Cell, summary: Summary, kind: 'home' | 'shop' | 'factory', radius: number): number {
  const table = kind === 'home' ? HOME_POP : kind === 'shop' ? SHOP_JOBS : FACTORY_JOBS
  let total = 0
  for (const other of summary.census) {
    if (other.kind !== kind || other.stage <= 0) continue
    if (!summary.served.has(cellKey(other.c, other.r))) continue
    if (Math.max(Math.abs(other.c - cell.c), Math.abs(other.r - cell.r)) > radius) continue
    total += table[other.stage] ?? 0
  }
  return total
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
