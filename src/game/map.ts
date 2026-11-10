import { hash2 } from './rng'
import { MAP_SIZE, type Terrain } from './types'

/**
 * Fictional waterfront plot. The coast is a sine wobble, not a real
 * shoreline and not a map from any other game.
 */
export function terrainAt(c: number, r: number, seed: number): Terrain {
  if (c < 0 || r < 0 || c >= MAP_SIZE || r >= MAP_SIZE) return 'water'
  const wobble = Math.sin((c + (seed % 5)) * 0.45) * 2.4 + Math.sin((c + 3) * 0.17) * 1.3
  const coast = 22 + wobble
  const n = hash2(c, r, seed)
  if (r > coast + n * 1.4) return 'water'
  if (r > coast - 0.85) return 'shore'
  if (n > 0.8 && r < 11 && c > 5 && c < MAP_SIZE - 5) return 'slope'
  return 'land'
}

/** A dry tile a few steps back from the harbour, so the first view shows water. */
export function startFocus(seed: number): { c: number; r: number } {
  const c = Math.floor(MAP_SIZE / 2)
  let coast = MAP_SIZE - 1
  for (let r = 0; r < MAP_SIZE; r++) {
    if (terrainAt(c, r, seed) === 'water') {
      coast = r
      break
    }
  }
  return { c: c - 1, r: Math.max(3, coast - 6) }
}

export function landFocus(seed: number): { c: number; r: number } {
  let c = 0
  let r = 0
  let n = 0
  for (let rr = 0; rr < MAP_SIZE; rr++) {
    for (let cc = 0; cc < MAP_SIZE; cc++) {
      if (terrainAt(cc, rr, seed) === 'water') continue
      c += cc
      r += rr
      n += 1
    }
  }
  if (!n) return { c: MAP_SIZE / 2, r: MAP_SIZE / 2 }
  return { c: c / n, r: r / n }
}

export function cellKey(c: number, r: number): string {
  return `${c},${r}`
}
