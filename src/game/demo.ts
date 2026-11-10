import { nearestLand } from './hk-geo'
import { terrainAt } from './map'
import { newGame } from './sim'
import type { BuildKind, Cell, GameState } from './types'

/** A short harbour-side block so the title is already lived-in. */
export function createDemo(): GameState {
  const seed = 7
  const state = newGame(seed)
  state.day = 0.48
  state.money = 8_420
  state.lastDelta = 96
  const anchor = nearestLand(114.165, 22.28, 4)
  if (!anchor) return state
  const planned: Array<[number, number, BuildKind, number]> = [
    [0, 0, 'road', 1],
    [1, 0, 'road', 1],
    [2, 0, 'road', 1],
    [3, 0, 'road', 1],
    [4, 0, 'road', 1],
    [5, 0, 'road', 1],
    [2, -1, 'road', 1],
    [2, 1, 'road', 1],
    [1, -1, 'power', 1],
    [0, 1, 'home', 3],
    [1, 1, 'home', 2],
    [3, 1, 'shop', 2],
    [4, 1, 'shop', 1],
    [5, -1, 'park', 2],
    [3, -1, 'home', 2],
  ]
  const used = new Set<string>()
  for (const [dc, dr, kind, stage] of planned) {
    const c = anchor.c + dc
    const r = anchor.r + dr
    if (terrainAt(c, r, seed) === 'water') continue
    const key = `${c},${r}`
    if (used.has(key)) continue
    used.add(key)
    const cell: Cell = { c, r, kind, stage, age: 8 }
    state.cells.push(cell)
  }
  state.stations = ['cen', 'adm', 'wc']
  const road = state.cells.find((cell) => cell.kind === 'road')
  const road2 = state.cells.filter((cell) => cell.kind === 'road')[3]
  if (road && road2) state.stops = [road, road2]
  return state
}

export function demoFocus(state: GameState): { c: number; r: number } {
  if (!state.cells.length) return nearestLand(114.168, 22.29, 2) ?? { c: 60, r: 50 }
  let c = 0
  let r = 0
  for (const cell of state.cells) {
    c += cell.c
    r += cell.r
  }
  return { c: c / state.cells.length, r: r / state.cells.length }
}
