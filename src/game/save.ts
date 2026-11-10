import type { Cam } from './iso'
import { terrainAt } from './map'
import { MAP_SIZE, type BuildKind, type BusStop, type Cell, type GameState, isBuildKind } from './types'

export const SAVE_KEY = 'ngo-zo-sing:v4'
const COMPACT_KEYS = ['ngo-zo-sing:v3', 'ngo-zo-sing:v2']
const LEGACY_KEY = 'ngo-zo-sing:v1'

export interface SaveFile {
  v: 4
  map: 'hk'
  /** Wide grid. Compact v2/v3 cities do not line up with these tiles. */
  grid: 'wide'
  seed: number
  day: number
  money: number
  speed: 1 | 3
  paused: boolean
  cells: Cell[]
  stations: string[]
  stops: BusStop[]
  piers?: string[]
  trams?: string[]
  guide?: boolean
  milestones?: string[]
  sawEight?: boolean
  name?: string
  cam: Cam
}

export function serialize(state: GameState, cam: Cam): SaveFile {
  return {
    v: 4,
    map: 'hk',
    grid: 'wide',
    seed: state.seed,
    day: state.day,
    money: state.money,
    speed: state.speed,
    paused: state.paused,
    cells: state.cells.map((cell) => ({
      c: cell.c,
      r: cell.r,
      kind: cell.kind,
      stage: cell.stage,
      age: cell.age,
    })),
    stations: [...(state.stations ?? [])],
    stops: (state.stops ?? []).map((stop) => ({ c: stop.c, r: stop.r })),
    piers: [...(state.piers ?? [])],
    trams: [...(state.trams ?? [])],
    guide: state.guide === true,
    milestones: [...(state.milestones ?? [])],
    sawEight: state.sawEight === true,
    name: (state.name || '我座城').slice(0, 12),
    cam: { x: cam.x, y: cam.y, zoom: cam.zoom },
  }
}

export function parseSave(raw: unknown): { state: GameState; cam: Cam } | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<SaveFile>
  if (data.v !== 4 || data.map !== 'hk' || data.grid !== 'wide') return null
  if (!isFiniteNumber(data.seed) || !isFiniteNumber(data.day) || !isFiniteNumber(data.money)) return null
  if (!data.cam || !isFiniteNumber(data.cam.x) || !isFiniteNumber(data.cam.y) || !isFiniteNumber(data.cam.zoom)) {
    return null
  }
  if (!Array.isArray(data.cells)) return null
  const cells: Cell[] = []
  const seen = new Set<string>()
  for (const item of data.cells) {
    if (!item || typeof item !== 'object') return null
    const cell = item as Partial<Cell>
    if (!isFiniteNumber(cell.c) || !isFiniteNumber(cell.r) || !isFiniteNumber(cell.stage) || !isFiniteNumber(cell.age)) {
      return null
    }
    if (!isBuildKind(cell.kind)) return null
    const c = Math.floor(cell.c)
    const r = Math.floor(cell.r)
    if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return null
    const key = `${c},${r}`
    if (seen.has(key)) return null
    if (terrainAt(c, r, Math.floor(data.seed)) === 'water' && cell.kind !== 'road') continue
    seen.add(key)
    cells.push({
      c,
      r,
      kind: cell.kind as BuildKind,
      stage: Math.max(0, Math.min(3, Math.floor(cell.stage))),
      age: Math.max(0, cell.age),
    })
  }
  const speed = data.speed === 3 ? 3 : 1
  return {
    state: {
      seed: Math.floor(data.seed),
      day: data.day,
      money: Math.max(0, Math.round(data.money)),
      cells,
      speed,
      paused: Boolean(data.paused),
      lastDelta: 0,
      broke: false,
      stations: cleanIds(data.stations),
      stops: cleanStops(data.stops),
      piers: cleanIds(data.piers),
      trams: cleanIds(data.trams),
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 12) : '我座城',
      guide: data.guide === true,
      milestones: cleanIds(data.milestones),
      sawEight: data.sawEight === true,
    },
    cam: {
      x: data.cam.x,
      y: data.cam.y,
      zoom: Math.min(1.85, Math.max(0.16, data.cam.zoom)),
    },
  }
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length < 24)
}

function cleanStops(value: unknown): BusStop[] {
  if (!Array.isArray(value)) return []
  const stops: BusStop[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const stop = item as Partial<BusStop>
    if (!isFiniteNumber(stop.c) || !isFiniteNumber(stop.r)) continue
    const c = Math.floor(stop.c)
    const r = Math.floor(stop.r)
    if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) continue
    stops.push({ c, r })
  }
  return stops
}

/** v1 square grids and v2/v3 compact Hong Kong saves do not match the wide tiles. */
export function rejectedSaveKeys(): readonly string[] {
  return [LEGACY_KEY, ...COMPACT_KEYS]
}

export function readSave(): { state: GameState; cam: Cam } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const text = localStorage.getItem(SAVE_KEY)
    if (!text) return null
    return parseSave(JSON.parse(text) as unknown)
  } catch {
    return null
  }
}

export function writeSave(state: GameState, cam: Cam): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state, cam)))
    return true
  } catch {
    return false
  }
}

export function clearSave(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* private mode */
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
