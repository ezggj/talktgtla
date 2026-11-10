import { nearestLand, regionAt } from './hk-geo'
import { cellKey } from './map'
import type { BusStop, GameState } from './types'
import type { TyphoonSignal } from './weather'

export const STATION_COST = 420
export const STOP_COST = 70

export type LineId = 'island' | 'tsuen' | 'kwun' | 'east' | 'tung'

export const LINE_COLOR: Record<LineId, string> = {
  island: '#3d7ea8',
  tsuen: '#e07a32',
  kwun: '#7a4ea3',
  east: '#c45b6a',
  tung: '#3f8f6b',
}

export const LINES: { id: LineId; name: string }[] = [
  { id: 'island', name: '港島綫' },
  { id: 'tsuen', name: '荃灣綫' },
  { id: 'kwun', name: '觀塘綫' },
  { id: 'east', name: '東鐵綫' },
  { id: 'tung', name: '東涌綫' },
]

interface StationDef {
  id: string
  name: string
  lon: number
  lat: number
  lines: LineId[]
}

const DEFS: StationDef[] = [
  { id: 'kt', name: '堅尼地城', lon: 114.129, lat: 22.281, lines: ['island'] },
  { id: 'sw', name: '上環', lon: 114.152, lat: 22.286, lines: ['island'] },
  { id: 'cen', name: '中環', lon: 114.158, lat: 22.282, lines: ['island', 'tsuen'] },
  { id: 'adm', name: '金鐘', lon: 114.165, lat: 22.279, lines: ['island', 'tsuen', 'east'] },
  { id: 'wc', name: '灣仔', lon: 114.173, lat: 22.278, lines: ['island'] },
  { id: 'cwb', name: '銅鑼灣', lon: 114.185, lat: 22.28, lines: ['island'] },
  { id: 'np', name: '北角', lon: 114.201, lat: 22.291, lines: ['island'] },
  { id: 'qb', name: '鰂魚涌', lon: 114.21, lat: 22.288, lines: ['island'] },
  { id: 'tk', name: '太古', lon: 114.216, lat: 22.285, lines: ['island'] },
  { id: 'skw', name: '筲箕灣', lon: 114.229, lat: 22.279, lines: ['island'] },
  { id: 'cw', name: '柴灣', lon: 114.237, lat: 22.265, lines: ['island'] },
  { id: 'tst', name: '尖沙咀', lon: 114.172, lat: 22.298, lines: ['tsuen'] },
  { id: 'jor', name: '佐敦', lon: 114.172, lat: 22.305, lines: ['tsuen'] },
  { id: 'ymt', name: '油麻地', lon: 114.171, lat: 22.313, lines: ['tsuen', 'kwun'] },
  { id: 'mk', name: '旺角', lon: 114.169, lat: 22.319, lines: ['tsuen', 'kwun'] },
  { id: 'ssp', name: '深水埗', lon: 114.162, lat: 22.331, lines: ['tsuen'] },
  { id: 'mf', name: '美孚', lon: 114.138, lat: 22.338, lines: ['tsuen'] },
  { id: 'lk', name: '荔景', lon: 114.127, lat: 22.348, lines: ['tsuen', 'tung'] },
  { id: 'kf', name: '葵芳', lon: 114.128, lat: 22.357, lines: ['tsuen'] },
  { id: 'tw', name: '荃灣', lon: 114.113, lat: 22.368, lines: ['tsuen'] },
  { id: 'wh', name: '黃埔', lon: 114.19, lat: 22.305, lines: ['kwun'] },
  { id: 'ktn', name: '九龍塘', lon: 114.176, lat: 22.337, lines: ['kwun', 'east'] },
  { id: 'wts', name: '黃大仙', lon: 114.194, lat: 22.342, lines: ['kwun'] },
  { id: 'dih', name: '鑽石山', lon: 114.202, lat: 22.34, lines: ['kwun'] },
  { id: 'kb', name: '九龍灣', lon: 114.214, lat: 22.323, lines: ['kwun'] },
  { id: 'ktg', name: '觀塘', lon: 114.226, lat: 22.312, lines: ['kwun'] },
  { id: 'lat', name: '藍田', lon: 114.233, lat: 22.307, lines: ['kwun'] },
  { id: 'hh', name: '紅磡', lon: 114.182, lat: 22.303, lines: ['east'] },
  { id: 'twai', name: '大圍', lon: 114.179, lat: 22.373, lines: ['east'] },
  { id: 'st', name: '沙田', lon: 114.188, lat: 22.382, lines: ['east'] },
  { id: 'tpm', name: '大埔墟', lon: 114.17, lat: 22.445, lines: ['east'] },
  { id: 'fan', name: '粉嶺', lon: 114.139, lat: 22.492, lines: ['east'] },
  { id: 'ss', name: '上水', lon: 114.128, lat: 22.501, lines: ['east'] },
  { id: 'lw', name: '羅湖', lon: 114.113, lat: 22.528, lines: ['east'] },
  { id: 'hk', name: '香港', lon: 114.158, lat: 22.285, lines: ['tung'] },
  { id: 'kln', name: '九龍', lon: 114.162, lat: 22.305, lines: ['tung'] },
  { id: 'oly', name: '奧運', lon: 114.16, lat: 22.318, lines: ['tung'] },
  { id: 'ty', name: '青衣', lon: 114.107, lat: 22.358, lines: ['tung'] },
  { id: 'tc', name: '東涌', lon: 113.941, lat: 22.289, lines: ['tung'] },
]

const LINE_ORDER: Record<LineId, string[]> = {
  island: ['kt', 'sw', 'cen', 'adm', 'wc', 'cwb', 'np', 'qb', 'tk', 'skw', 'cw'],
  tsuen: ['cen', 'adm', 'tst', 'jor', 'ymt', 'mk', 'ssp', 'mf', 'lk', 'kf', 'tw'],
  kwun: ['wh', 'ymt', 'mk', 'ktn', 'wts', 'dih', 'kb', 'ktg', 'lat'],
  east: ['adm', 'hh', 'ktn', 'twai', 'st', 'tpm', 'fan', 'ss', 'lw'],
  tung: ['hk', 'kln', 'oly', 'lk', 'ty', 'tc'],
}

export interface Station {
  id: string
  name: string
  lines: LineId[]
  c: number
  r: number
}

function placeStations(): Station[] {
  const used = new Set<string>()
  const placed: Station[] = []
  for (const def of DEFS) {
    const spot = nearestLand(def.lon, def.lat, 16)
    if (!spot) continue
    let { c, r } = spot
    if (used.has(`${c},${r}`)) {
      const nudge = nearestFree(c, r, used)
      if (!nudge) continue
      c = nudge.c
      r = nudge.r
    }
    used.add(`${c},${r}`)
    placed.push({ id: def.id, name: def.name, lines: def.lines, c, r })
  }
  return placed
}

function nearestFree(c: number, r: number, used: Set<string>): { c: number; r: number } | null {
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const nc = c + dc
    const nr = r + dr
    if (used.has(`${nc},${nr}`)) continue
    if (nearestLand !== undefined && regionAt(nc, nr) < 0) continue
    return { c: nc, r: nr }
  }
  return null
}

export const STATIONS: Station[] = placeStations()

const BY_ID = new Map(STATIONS.map((station) => [station.id, station]))

export function stationById(id: string): Station | undefined {
  return BY_ID.get(id)
}

export function stationsOn(line: LineId): Station[] {
  const out: Station[] = []
  for (const id of LINE_ORDER[line]) {
    const station = BY_ID.get(id)
    if (station) out.push(station)
  }
  return out
}

export function linkedIds(built: readonly string[]): Set<string> {
  const have = new Set(built)
  const linked = new Set<string>()
  for (const ids of Object.values(LINE_ORDER)) {
    for (let i = 0; i < ids.length; i++) {
      if (!have.has(ids[i])) continue
      const prev = i > 0 && have.has(ids[i - 1])
      const next = i + 1 < ids.length && have.has(ids[i + 1])
      if (prev || next) linked.add(ids[i])
    }
  }
  return linked
}

export function nearestUnbuilt(
  line: LineId,
  c: number,
  r: number,
  built: readonly string[],
): Station | null {
  const have = new Set(built)
  let best: Station | null = null
  let bestD = 2.6 ** 2
  for (const station of stationsOn(line)) {
    if (have.has(station.id)) continue
    const d = (station.c - c) ** 2 + (station.r - r) ** 2
    if (d < bestD) {
      bestD = d
      best = station
    }
  }
  return best
}

export interface TransitFx {
  tiles: Set<string>
  fare: number
  linked: number
  busLinked: number
  crossHarbour: boolean
}

export function transitFx(state: Pick<GameState, 'stations' | 'stops' | 'cells'>, signal: TyphoonSignal = 0): TransitFx {
  const linked = linkedIds(state.stations ?? [])
  const tiles = new Set<string>()
  for (const id of linked) {
    const station = BY_ID.get(id)
    if (!station) continue
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) > 3) continue
        tiles.add(cellKey(station.c + dc, station.r + dr))
      }
    }
  }
  for (const line of Object.keys(LINE_ORDER) as LineId[]) {
    for (const [from, to] of segmentPairs([...linked], line)) {
      const steps = Math.max(1, Math.max(Math.abs(to.c - from.c), Math.abs(to.r - from.r)))
      for (let step = 0; step <= steps; step++) {
        const c = Math.round(from.c + ((to.c - from.c) * step) / steps)
        const r = Math.round(from.r + ((to.r - from.r) * step) / steps)
        tiles.add(cellKey(c, r))
        tiles.add(cellKey(c + 1, r))
        tiles.add(cellKey(c - 1, r))
        tiles.add(cellKey(c, r + 1))
        tiles.add(cellKey(c, r - 1))
      }
    }
  }
  const roads = new Set(
    (state.cells ?? []).filter((cell) => cell.kind === 'road').map((cell) => cellKey(cell.c, cell.r)),
  )
  const stops = (state.stops ?? []).filter((stop) => roads.has(cellKey(stop.c, stop.r)))
  const stopRegions = new Set<number>()
  let busLinked = 0
  if (signal < 8 && stops.length >= 2 && stopsConnected(stops, roads)) {
    busLinked = stops.length
    for (const stop of stops) {
      stopRegions.add(regionAt(stop.c, stop.r))
      for (const [dc, dr] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        tiles.add(cellKey(stop.c + dc, stop.r + dr))
      }
    }
  }
  const crossHarbour = [...stopRegions].filter((id) => id >= 0).length >= 2
  const fare = linked.size * 8 + busLinked * 3 + (crossHarbour ? 12 : 0)
  return { tiles, fare, linked: linked.size, busLinked, crossHarbour }
}

function stopsConnected(stops: BusStop[], roads: Set<string>): boolean {
  if (stops.length < 2) return false
  const seen = new Set<string>([cellKey(stops[0].c, stops[0].r)])
  const stack = [stops[0]]
  while (stack.length) {
    const cur = stack.pop()!
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const key = cellKey(cur.c + dc, cur.r + dr)
      if (!roads.has(key) || seen.has(key)) continue
      seen.add(key)
      stack.push({ c: cur.c + dc, r: cur.r + dr })
    }
  }
  return stops.every((stop) => seen.has(cellKey(stop.c, stop.r)))
}

export function buildStation(state: GameState, id: string): 'ok' | 'money' | 'have' | 'missing' {
  if (!BY_ID.has(id)) return 'missing'
  if (state.stations.includes(id)) return 'have'
  if (state.money < STATION_COST) return 'money'
  state.money -= STATION_COST
  state.stations.push(id)
  if (state.money > 0) state.broke = false
  return 'ok'
}

export function buildStop(state: GameState, c: number, r: number): 'ok' | 'money' | 'road' | 'have' {
  const onRoad = state.cells.some((cell) => cell.kind === 'road' && cell.c === c && cell.r === r)
  if (!onRoad) return 'road'
  if (state.stops.some((stop) => stop.c === c && stop.r === r)) return 'have'
  if (state.money < STOP_COST) return 'money'
  state.money -= STOP_COST
  state.stops.push({ c, r })
  if (state.money > 0) state.broke = false
  return 'ok'
}

export function refundStation(state: GameState, id: string): boolean {
  const index = state.stations.indexOf(id)
  if (index < 0) return false
  state.stations.splice(index, 1)
  state.money += Math.round(STATION_COST * 0.35)
  return true
}

export function segmentPairs(built: readonly string[], line: LineId): [Station, Station][] {
  const have = new Set(built)
  const list = stationsOn(line)
  const pairs: [Station, Station][] = []
  for (let i = 1; i < list.length; i++) {
    if (have.has(list[i - 1].id) && have.has(list[i].id)) pairs.push([list[i - 1], list[i]])
  }
  return pairs
}
