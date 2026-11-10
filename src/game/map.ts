import { coastAt, frameTerritory, harbourView, regionAt } from './hk-geo'
import { defaultZoom, focusCamera } from './iso'
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

/** Play starts on the harbour, close enough to read a street. Zoom out still reaches the whole coast. */
export function framePlay(viewW: number, viewH: number) {
  const focus = harbourView()
  const cam = focusCamera(viewW, viewH, defaultZoom(viewW), focus.c, focus.r)
  if (viewW >= 960) cam.x += Math.min(140, viewW * 0.07)
  return cam
}

export function cellKey(c: number, r: number): string {
  return `${c},${r}`
}
