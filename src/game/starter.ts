import { coastAt, nearestLand } from './hk-geo'
import { cellKey } from './map'
import type { BuildKind, Cell, GameState } from './types'

/**
 * A modest city already on the ground: Central, Tsim Sha Tsui, a bit of
 * Mong Kok, the harbour ferry, and a short Island tram. Not a full metro.
 */
export function seedLivingCity(state: GameState): GameState {
  const used = new Set<string>()
  const put = (c: number, r: number, kind: BuildKind, stage: number) => {
    if (coastAt(c, r) === 'water' || coastAt(c, r) === 'parkland' || coastAt(c, r) === 'slope') return false
    const key = cellKey(c, r)
    if (used.has(key)) return false
    used.add(key)
    const cell: Cell = { c, r, kind, stage, age: 6 }
    state.cells.push(cell)
    return true
  }

  const street = (lon: number, lat: number, dc: number, dr: number, length: number) => {
    const origin = nearestLand(lon, lat, 3)
    if (!origin) return []
    const tiles: { c: number; r: number }[] = []
    for (let i = 0; i < length; i++) {
      const c = origin.c + dc * i
      const r = origin.r + dr * i
      if (put(c, r, 'road', 1)) tiles.push({ c, r })
    }
    return tiles
  }

  const central = street(114.158, 22.283, 1, 0, 5)
  const tst = street(114.172, 22.297, 0, -1, 4)
  street(114.169, 22.319, 1, 0, 4)

  const beside = (road: { c: number; r: number } | undefined, kind: BuildKind, stage: number) => {
    if (!road) return false
    for (const [dc, dr] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      if (put(road.c + dc, road.r + dr, kind, stage)) return true
    }
    return false
  }

  for (const group of [central, tst]) {
    for (const road of group) {
      if (beside(road, 'power', 1)) break
    }
  }
  beside(central[1], 'home', 2)
  beside(central[2], 'shop', 2)
  beside(central[3], 'home', 2)
  beside(central[4], 'park', 2)
  beside(tst[1], 'home', 2)
  beside(tst[2], 'shop', 1)

  state.stations = ['cen', 'adm', 'tst', 'mk']
  state.piers = ['central', 'tst']
  state.trams = ['t-sw', 't-cen', 't-adm', 't-wc']
  state.money = Math.max(state.money, 6000)
  return state
}
