import { newGame } from './sim'
import type { GameState } from './types'

/** Title screen uses the same lived-in harbour city a new game starts with. */
export function createDemo(): GameState {
  const state = newGame(7)
  state.day = 0.48
  state.lastDelta = 96
  return state
}

export function demoFocus(state: GameState): { c: number; r: number } {
  if (!state.cells.length) return { c: 60, r: 50 }
  let c = 0
  let r = 0
  for (const cell of state.cells) {
    c += cell.c
    r += cell.r
  }
  return { c: c / state.cells.length, r: r / state.cells.length }
}
