import { nearestLand } from './hk-geo'
import { cellKey } from './map'
import type { GameState } from './types'
import type { TyphoonSignal } from './weather'

export const PIER_COST = 380
export const TRAM_COST = 240

export interface Pier {
  id: string
  name: string
  c: number
  r: number
}

export interface TramStop {
  id: string
  name: string
  c: number
  r: number
}

interface PierDef {
  id: string
  name: string
  lon: number
  lat: number
}

const PIER_DEFS: PierDef[] = [
  { id: 'central', name: '中環碼頭', lon: 114.16, lat: 22.287 },
  { id: 'tst', name: '尖沙咀碼頭', lon: 114.172, lat: 22.294 },
  { id: 'lamma', name: '榕樹灣', lon: 114.13, lat: 22.226 },
  { id: 'cheungchau', name: '長洲', lon: 114.028, lat: 22.208 },
  { id: 'muiwo', name: '梅窩', lon: 114.0, lat: 22.266 },
]

const ROUTES: { id: string; name: string; a: string; b: string; kind: 'harbour' | 'outlying' }[] = [
  { id: 'star', name: '維港', a: 'central', b: 'tst', kind: 'harbour' },
  { id: 'lamma', name: '南丫', a: 'central', b: 'lamma', kind: 'outlying' },
  { id: 'cheung', name: '長洲', a: 'central', b: 'cheungchau', kind: 'outlying' },
  { id: 'muiwo', name: '梅窩', a: 'central', b: 'muiwo', kind: 'outlying' },
]

const TRAM_DEFS: PierDef[] = [
  { id: 't-kt', name: '堅尼地城', lon: 114.129, lat: 22.283 },
  { id: 't-sw', name: '上環', lon: 114.151, lat: 22.287 },
  { id: 't-cen', name: '中環', lon: 114.158, lat: 22.284 },
  { id: 't-adm', name: '金鐘', lon: 114.165, lat: 22.281 },
  { id: 't-wc', name: '灣仔', lon: 114.173, lat: 22.279 },
  { id: 't-cwb', name: '銅鑼灣', lon: 114.184, lat: 22.281 },
  { id: 't-np', name: '北角', lon: 114.2, lat: 22.29 },
  { id: 't-qb', name: '鰂魚涌', lon: 114.211, lat: 22.287 },
  { id: 't-skw', name: '筲箕灣', lon: 114.228, lat: 22.28 },
]

function snap(defs: PierDef[]): Pier[] {
  const used = new Set<string>()
  const out: Pier[] = []
  for (const def of defs) {
    const spot = nearestLand(def.lon, def.lat, 4)
    if (!spot) continue
    let c = spot.c
    let r = spot.r
    if (used.has(`${c},${r}`)) {
      const free = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]
        .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
        .find((cell) => !used.has(`${cell.c},${cell.r}`) && nearestLand(def.lon, def.lat, 5))
      if (!free) continue
      c = free.c
      r = free.r
    }
    used.add(`${c},${r}`)
    out.push({ id: def.id, name: def.name, c, r })
  }
  return out
}

export const PIERS: Pier[] = snap(PIER_DEFS)
export const TRAM_STOPS: TramStop[] = snap(TRAM_DEFS)

const PIER_BY = new Map(PIERS.map((pier) => [pier.id, pier]))
const TRAM_BY = new Map(TRAM_STOPS.map((stop) => [stop.id, stop]))

export function pierById(id: string): Pier | undefined {
  return PIER_BY.get(id)
}

export function tramById(id: string): TramStop | undefined {
  return TRAM_BY.get(id)
}

export function nearestPier(c: number, r: number, built: readonly string[]): Pier | null {
  const have = new Set(built)
  let best: Pier | null = null
  let bestD = 2.8 ** 2
  for (const pier of PIERS) {
    if (have.has(pier.id)) continue
    const d = (pier.c - c) ** 2 + (pier.r - r) ** 2
    if (d < bestD) {
      bestD = d
      best = pier
    }
  }
  return best
}

export function nearestTram(c: number, r: number, built: readonly string[]): TramStop | null {
  const have = new Set(built)
  let best: TramStop | null = null
  let bestD = 2.8 ** 2
  for (const stop of TRAM_STOPS) {
    if (have.has(stop.id)) continue
    const d = (stop.c - c) ** 2 + (stop.r - r) ** 2
    if (d < bestD) {
      bestD = d
      best = stop
    }
  }
  return best
}

export function buildPier(state: GameState, id: string): 'ok' | 'money' | 'have' | 'missing' {
  if (!PIER_BY.has(id)) return 'missing'
  if (state.piers.includes(id)) return 'have'
  if (state.money < PIER_COST) return 'money'
  state.money -= PIER_COST
  state.piers.push(id)
  if (state.money > 0) state.broke = false
  return 'ok'
}

export function buildTram(state: GameState, id: string): 'ok' | 'money' | 'have' | 'missing' {
  if (!TRAM_BY.has(id)) return 'missing'
  if (state.trams.includes(id)) return 'have'
  if (state.money < TRAM_COST) return 'money'
  state.money -= TRAM_COST
  state.trams.push(id)
  if (state.money > 0) state.broke = false
  return 'ok'
}

export interface HarbourFx {
  tiles: Set<string>
  fare: number
  ferries: number
  trams: number
}

export function harbourFx(state: Pick<GameState, 'piers' | 'trams'>, signal: TyphoonSignal): HarbourFx {
  const tiles = new Set<string>()
  const have = new Set(state.piers ?? [])
  let ferries = 0
  let fare = 0
  const stopped = signal >= 8
  for (const route of ROUTES) {
    if (!have.has(route.a) || !have.has(route.b)) continue
    if (stopped) continue
    if (signal >= 3 && route.kind === 'outlying') continue
    ferries += 1
    fare += route.kind === 'harbour' ? 14 : 18
    for (const id of [route.a, route.b]) {
      const pier = PIER_BY.get(id)
      if (!pier) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) tiles.add(cellKey(pier.c + dc, pier.r + dr))
      }
    }
  }
  const tramIds = TRAM_STOPS.map((stop) => stop.id)
  const builtTram = new Set(state.trams ?? [])
  let trams = 0
  if (signal < 8) {
    for (let i = 1; i < tramIds.length; i++) {
      if (!builtTram.has(tramIds[i - 1]) || !builtTram.has(tramIds[i])) continue
      trams += 1
      fare += 6
      for (const id of [tramIds[i - 1], tramIds[i]]) {
        const stop = TRAM_BY.get(id)
        if (!stop) continue
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) tiles.add(cellKey(stop.c + dc, stop.r + dr))
        }
      }
    }
  }
  return { tiles, fare, ferries, trams }
}

export function runningFerries(state: Pick<GameState, 'piers'>, signal: TyphoonSignal) {
  const have = new Set(state.piers ?? [])
  return ROUTES.filter((route) => {
    if (!have.has(route.a) || !have.has(route.b)) return false
    if (signal >= 8) return false
    if (signal >= 3 && route.kind === 'outlying') return false
    return true
  }).map((route) => ({
    ...route,
    from: PIER_BY.get(route.a)!,
    to: PIER_BY.get(route.b)!,
  }))
}

export function runningTramPairs(state: Pick<GameState, 'trams'>, signal: TyphoonSignal) {
  if (signal >= 8) return []
  const built = new Set(state.trams ?? [])
  const pairs: [TramStop, TramStop][] = []
  for (let i = 1; i < TRAM_STOPS.length; i++) {
    if (built.has(TRAM_STOPS[i - 1].id) && built.has(TRAM_STOPS[i].id)) {
      pairs.push([TRAM_STOPS[i - 1], TRAM_STOPS[i]])
    }
  }
  return pairs
}
