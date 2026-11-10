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

  const open = (c: number, r: number) => {
    const ground = coastAt(c, r)
    return ground === 'land' || ground === 'shore'
  }

  const street = (lon: number, lat: number, dc: number, dr: number, length: number) => {
    const origin = nearestLand(lon, lat, 8)
    if (!origin) return []
    const tiles: { c: number; r: number }[] = []
    let c = origin.c
    let r = origin.r
    for (let step = 0; step < length * 4 && tiles.length < length; step++) {
      if (open(c, r)) put(c, r, 'road', 1) && tiles.push({ c, r })
      let next = { c: c + dc, r: r + dr }
      if (!open(next.c, next.r)) {
        const slide = [
          { c: next.c + dr, r: next.r + dc },
          { c: next.c - dr, r: next.r - dc },
        ].find((cell) => open(cell.c, cell.r))
        if (!slide) break
        next = slide
      }
      if (tiles.some((tile) => tile.c === next.c && tile.r === next.r)) break
      c = next.c
      r = next.r
    }
    return tiles
  }

  const central = street(114.158, 22.283, 1, 0, 5)
  const tst = street(114.172, 22.297, 0, -1, 5)
  const mongkok = street(114.169, 22.319, 1, 0, 4)

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

  for (const group of [central, tst, mongkok]) {
    for (const road of group) {
      if (beside(road, 'power', 1)) break
    }
  }
  const dress = (roads: { c: number; r: number }[]) => {
    roads.forEach((road, index) => {
      if (index === 2) beside(road, 'park', 2)
      else if (index % 2 === 0) beside(road, 'shop', 2)
      else beside(road, 'home', 1)
      if (index % 2 === 1) beside(road, 'home', 1)
    })
  }
  dress(central)
  dress(tst)
  beside(mongkok[1], 'shop', 2)
  beside(mongkok[2], 'home', 1)

  state.stations = ['cen', 'adm', 'tst', 'mk']
  state.piers = ['central', 'tst']
  state.trams = ['t-sw', 't-cen', 't-adm', 't-wc']
  state.money = Math.max(state.money, 6000)
  return state
}
