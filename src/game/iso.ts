import { MAP_SIZE } from './types'

export const TILE_W = 64
export const TILE_H = 32

export interface Cam {
  x: number
  y: number
  zoom: number
}

export function tileTop(c: number, r: number, cam: Cam): { x: number; y: number } {
  const hw = (TILE_W * cam.zoom) / 2
  const hh = (TILE_H * cam.zoom) / 2
  return {
    x: (c - r) * hw + cam.x,
    y: (c + r) * hh + cam.y,
  }
}

/** Screen point at the middle of a tile. */
export function tileCenter(c: number, r: number, cam: Cam): { x: number; y: number } {
  return tileTop(c + 0.5, r + 0.5, cam)
}

export function screenToTile(sx: number, sy: number, cam: Cam): { c: number; r: number } {
  const hw = (TILE_W * cam.zoom) / 2
  const hh = (TILE_H * cam.zoom) / 2
  const x = (sx - cam.x) / hw
  const y = (sy - cam.y) / hh
  return { c: Math.floor((x + y) / 2), r: Math.floor((y - x) / 2) }
}

export function focusCamera(viewW: number, viewH: number, zoom: number, c: number, r: number): Cam {
  const origin: Cam = { x: 0, y: 0, zoom }
  const center = tileCenter(c, r, origin)
  return {
    x: viewW / 2 - center.x,
    y: viewH / 2 - center.y + viewH * 0.04,
    zoom,
  }
}

export function defaultZoom(viewW: number): number {
  if (viewW < 520) return 1
  if (viewW < 900) return 1.2
  return 1.45
}

export function focusMap(viewW: number, viewH: number, zoom: number, c: number, r: number): Cam {
  return focusCamera(viewW, viewH, zoom, c, r)
}

export function mapCenterFocus(): { c: number; r: number } {
  return { c: (MAP_SIZE - 1) / 2, r: (MAP_SIZE - 1) / 2 }
}

export function clampZoom(zoom: number): number {
  return Math.min(1.85, Math.max(0.52, zoom))
}
