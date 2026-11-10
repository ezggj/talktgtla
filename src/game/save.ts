import type { Cam } from './iso'
import { MAP_SIZE, type BuildKind, type Cell, type GameState, isBuildKind } from './types'

export const SAVE_KEY = 'ngo-zo-sing:v1'

export interface SaveFile {
  v: 1
  seed: number
  day: number
  money: number
  speed: 1 | 3
  paused: boolean
  cells: Cell[]
  cam: Cam
}

export function serialize(state: GameState, cam: Cam): SaveFile {
  return {
    v: 1,
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
    cam: { x: cam.x, y: cam.y, zoom: cam.zoom },
  }
}

export function parseSave(raw: unknown): { state: GameState; cam: Cam } | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<SaveFile>
  if (data.v !== 1) return null
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
    },
    cam: {
      x: data.cam.x,
      y: data.cam.y,
      zoom: Math.min(1.85, Math.max(0.52, data.cam.zoom)),
    },
  }
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
