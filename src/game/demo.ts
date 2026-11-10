import { terrainAt } from './map'
import { newGame } from './sim'
import { MAP_SIZE, type BuildKind, type Cell, type GameState } from './types'

/**
 * A small original cluster for the title screen. Hand-placed on whatever
 * dry rectangle the seed provides — not a copied city layout.
 */
export function createDemo(): GameState {
  const seed = 7
  const state = newGame(seed)
  const anchor = findPad(seed, 10, 8)
  state.day = 0.48
  state.money = 8_420
  state.lastDelta = 120
  if (!anchor) return state

  const planned: Array<[number, number, BuildKind, number]> = [
    [0, 4, 'road', 1],
    [1, 4, 'road', 1],
    [2, 4, 'road', 1],
    [3, 4, 'road', 1],
    [4, 4, 'road', 1],
    [5, 4, 'road', 1],
    [6, 4, 'road', 1],
    [7, 4, 'road', 1],
    [8, 4, 'road', 1],
    [9, 4, 'road', 1],
    [2, 1, 'road', 1],
    [2, 2, 'road', 1],
    [2, 3, 'road', 1],
    [2, 5, 'road', 1],
    [2, 6, 'road', 1],
    [7, 1, 'road', 1],
    [7, 2, 'road', 1],
    [7, 3, 'road', 1],
    [7, 5, 'road', 1],
    [7, 6, 'road', 1],
    [1, 3, 'power', 1],
    [0, 5, 'home', 2],
    [1, 5, 'home', 3],
    [3, 5, 'home', 1],
    [4, 5, 'home', 2],
    [5, 3, 'home', 2],
    [6, 5, 'home', 1],
    [3, 3, 'shop', 2],
    [4, 3, 'shop', 3],
    [8, 3, 'shop', 1],
    [8, 5, 'factory', 2],
    [9, 3, 'factory', 1],
    [0, 2, 'park', 3],
    [5, 1, 'park', 2],
    [9, 5, 'home', 2],
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
  return state
}

export function demoFocus(state: GameState): { c: number; r: number } {
  if (!state.cells.length) return { c: MAP_SIZE / 2, r: MAP_SIZE / 2 }
  let c = 0
  let r = 0
  for (const cell of state.cells) {
    c += cell.c
    r += cell.r
  }
  return { c: c / state.cells.length, r: r / state.cells.length }
}

function findPad(seed: number, width: number, height: number): { c: number; r: number } | null {
  for (let r = MAP_SIZE - height - 1; r >= 1; r--) {
    for (let c = 1; c < MAP_SIZE - width - 1; c++) {
      let ok = true
      for (let dr = 0; dr < height && ok; dr++) {
        for (let dc = 0; dc < width && ok; dc++) {
          if (terrainAt(c + dc, r + dr, seed) === 'water') ok = false
        }
      }
      if (ok) return { c, r }
    }
  }
  return null
}
