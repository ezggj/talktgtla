import { cellKey } from './map'
import { hash2 } from './rng'
import type { Cell } from './types'
import type { TyphoonSignal } from './weather'

/** Short calendar moments. Derived from the day, so old saves need no new fields. */
export type CityEvent = 'newyear' | 'autumn' | 'rain' | 'burst' | 'delay' | null

export function cityEvent(day: number, signal: TyphoonSignal): CityEvent {
  if (signal >= 8) return null
  const n = Math.floor(Math.max(0, day)) % 18
  if (n === 1 || n === 2) return 'newyear'
  if (n === 6) return 'autumn'
  if (n === 10 && signal === 0) return 'rain'
  if (n === 13) return 'burst'
  if (n === 16) return 'delay'
  return null
}

export function eventCopy(event: CityEvent): string | null {
  if (event === 'newyear') return '新年，舖頭擠滿人，生意旺啲。'
  if (event === 'autumn') return '中秋，人湧去公園坐。'
  if (event === 'rain') return '突然落大雨，車慢咗。'
  if (event === 'burst') return '有條路爆水管，要行第二條。'
  if (event === 'delay') return '港鐵延誤，人湧返出路面。'
  return null
}

export function eventShopMul(event: CityEvent): number {
  if (event === 'newyear') return 1.28
  if (event === 'autumn') return 1.12
  if (event === 'rain') return 0.88
  return 1
}

/** One road tile closes for the burst-main day. */
export function closedRoads(day: number, seed: number, event: CityEvent, cells: readonly Cell[]): Set<string> {
  if (event !== 'burst') return new Set()
  const roads = cells.filter((cell) => cell.kind === 'road')
  if (!roads.length) return new Set()
  const pick = roads[Math.floor(hash2(Math.floor(day), 4, seed + 5) * roads.length) % roads.length]
  return new Set([cellKey(pick.c, pick.r)])
}
