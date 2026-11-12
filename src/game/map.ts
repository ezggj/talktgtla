import { coastAt, frameTerritory, harbourView, nearestLand, regionAt } from './hk-geo'
import { focusCamera } from './iso'
import type { Terrain } from './types'

/**
 * Fixed Hong Kong coastline. The seed does not move the shore, so every
 * city is the same territory. Building colours still vary with the seed.
 */
export function terrainAt(c: number, r: number, seed: number): Terrain {
  void seed
  return coastAt(c, r)
}

export function landRegion(c: number, r: number): number {
  return regionAt(c, r)
}

export function startFocus(): { c: number; r: number } {
  return harbourView()
}

export function frameLand(viewW: number, viewH: number) {
  return frameTerritory(viewW, viewH)
}

/**
 * Play starts on the streets that already exist, not the empty harbour.
 * The bottom bar covers the lower part of the screen, so the street sits above it.
 */
export function framePlay(viewW: number, viewH: number) {
  const focus = nearestLand(114.158, 22.282, 10) ?? harbourView()
  const zoom = viewW < 720 ? 0.78 : 1.05
  const cam = focusCamera(viewW, viewH, zoom, focus.c, focus.r)
  cam.y -= viewW < 720 ? 150 : 140
  if (viewW >= 960) cam.x += 40
  return cam
}

export function cellKey(c: number, r: number): string {
  return `${c},${r}`
}
