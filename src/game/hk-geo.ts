import { TILE_H, TILE_W, tileCenter, type Cam } from './iso'
import { HK_RINGS } from './hk-coast'
import { MAP_SIZE } from './types'

/**
 * North is up on screen. Longitude runs left to right, latitude top to bottom.
 * The isometric grid is only the storage; the silhouette is the real territory.
 */
const LON0 = 113.83
const LON1 = 114.42
const LAT_N = 22.565
const LAT_S = 22.175
const S0 = 52
const NROWS = 132
const NCOLS = 48
const E_BASE = -48

const WATER = 0
const LAND = 1
const SHORE = 2
const SLOPE = 3
const PARKLAND = 4

/** Steep hills and country parks. Town centres are outside these circles. */
const PROTECTED = [
  { lon: 114.149, lat: 22.271, km: 0.95 },
  { lon: 114.124, lat: 22.411, km: 2.8 },
  { lon: 114.178, lat: 22.356, km: 1.15 },
  { lon: 114.35, lat: 22.4, km: 3.4 },
  { lon: 114.27, lat: 22.49, km: 2.2 },
  { lon: 113.96, lat: 22.23, km: 2.6 },
  { lon: 114.155, lat: 22.252, km: 1.05 },
  { lon: 114.24, lat: 22.24, km: 1.3 },
]

const mask = new Uint8Array(MAP_SIZE * MAP_SIZE)
const region = new Int16Array(MAP_SIZE * MAP_SIZE).fill(-1)

let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null

function pointInRing(lon: number, lat: number, ring: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if (yi > lat === yj > lat) continue
    const xCross = ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (lon < xCross) inside = !inside
  }
  return inside
}

function onLand(lon: number, lat: number): boolean {
  for (const ring of HK_RINGS) {
    if (pointInRing(lon, lat, ring)) return true
  }
  return false
}

function cellOf(ix: number, iy: number): { c: number; r: number } | null {
  const s = S0 + iy
  const e = E_BASE + ix * 2 + (s % 2)
  const c = (s + e) / 2
  const r = (s - e) / 2
  if (!Number.isInteger(c) || !Number.isInteger(r)) return null
  if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return null
  return { c, r }
}

function lonLatOf(ix: number, iy: number): { lon: number; lat: number } {
  return {
    lon: LON0 + ((LON1 - LON0) * ix) / (NCOLS - 1),
    lat: LAT_N - ((LAT_N - LAT_S) * iy) / (NROWS - 1),
  }
}

function km2(lon: number, lat: number, zone: { lon: number; lat: number }): number {
  return (lon - zone.lon) ** 2 * 94 ** 2 + (lat - zone.lat) ** 2 * 111 ** 2
}

function inProtected(lon: number, lat: number): boolean {
  return PROTECTED.some((zone) => km2(lon, lat, zone) <= zone.km * zone.km)
}

function buildMask() {
  const land: { c: number; r: number }[] = []
  for (let iy = 0; iy < NROWS; iy++) {
    for (let ix = 0; ix < NCOLS; ix++) {
      const cell = cellOf(ix, iy)
      if (!cell) continue
      const { lon, lat } = lonLatOf(ix, iy)
      if (!onLand(lon, lat)) continue
      const i = cell.r * MAP_SIZE + cell.c
      if (mask[i] !== WATER) continue
      mask[i] = inProtected(lon, lat) ? PARKLAND : LAND
      land.push(cell)
    }
  }
  for (const cell of land) {
    const i = cell.r * MAP_SIZE + cell.c
    if (mask[i] === SLOPE || mask[i] === PARKLAND) continue
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = cell.c + dc
      const nr = cell.r + dr
      if (nc < 0 || nr < 0 || nc >= MAP_SIZE || nr >= MAP_SIZE || mask[nr * MAP_SIZE + nc] === WATER) {
        mask[i] = SHORE
        break
      }
    }
  }
  let next = 0
  for (const start of land) {
    const si = start.r * MAP_SIZE + start.c
    if (region[si] >= 0) continue
    const id = next++
    const stack = [start]
    region[si] = id
    while (stack.length) {
      const cur = stack.pop()!
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nc = cur.c + dc
        const nr = cur.r + dr
        if (nc < 0 || nr < 0 || nc >= MAP_SIZE || nr >= MAP_SIZE) continue
        const ni = nr * MAP_SIZE + nc
        if (mask[ni] === WATER || region[ni] >= 0) continue
        region[ni] = id
        stack.push({ c: nc, r: nr })
      }
    }
  }
}

buildMask()

export type CoastKind = 'water' | 'shore' | 'land' | 'slope' | 'parkland'

export function coastAt(c: number, r: number): CoastKind {
  if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return 'water'
  const value = mask[r * MAP_SIZE + c]
  if (value === PARKLAND) return 'parkland'
  if (value === SHORE) return 'shore'
  if (value === SLOPE) return 'slope'
  if (value === LAND) return 'land'
  return 'water'
}

export function regionAt(c: number, r: number): number {
  if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return -1
  return region[r * MAP_SIZE + c]
}

export function projectCell(lon: number, lat: number): { c: number; r: number } | null {
  const u = (lon - LON0) / (LON1 - LON0)
  const v = (LAT_N - lat) / (LAT_N - LAT_S)
  if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) return null
  const ix = Math.round(Math.min(NCOLS - 1, Math.max(0, u * (NCOLS - 1))))
  const iy = Math.round(Math.min(NROWS - 1, Math.max(0, v * (NROWS - 1))))
  return cellOf(ix, iy)
}

export function nearestLand(lon: number, lat: number, radius = 3): { c: number; r: number } | null {
  const origin = projectCell(lon, lat)
  if (!origin) return null
  if (coastAt(origin.c, origin.r) !== 'water') return origin
  let best: { c: number; r: number } | null = null
  let bestD = Infinity
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const c = origin.c + dc
      const r = origin.r + dr
      if (coastAt(c, r) === 'water') continue
      const d = dc * dc + dr * dr
      if (d < bestD) {
        bestD = d
        best = { c, r }
      }
    }
  }
  return best
}

export function harbourView(): { c: number; r: number } {
  return projectCell(114.168, 22.29) ?? { c: 50, r: 44 }
}

export function frameTerritory(viewW: number, viewH: number): Cam {
  if (!bounds) {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const cam = { x: 0, y: 0, zoom: 1 }
    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        if (mask[r * MAP_SIZE + c] === WATER) continue
        const p = tileCenter(c, r, cam)
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
    }
    bounds = {
      minX: minX - TILE_W,
      maxX: maxX + TILE_W,
      minY: minY - TILE_H * 2,
      maxY: maxY + TILE_H,
    }
  }
  const bw = Math.max(1, bounds.maxX - bounds.minX)
  const bh = Math.max(1, bounds.maxY - bounds.minY)
  const zoom = Math.min(1.05, Math.max(0.16, Math.min(viewW / bw, viewH / bh) * 0.92))
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  return {
    zoom,
    x: viewW / 2 - cx * zoom,
    y: viewH / 2 - cy * zoom,
  }
}
