/** Shared types and tuning for 我座城. Art, map, and rules are original. */

export const MAP_SIZE = 32
export const DAY_MS = 20_000
export const POWER_RANGE = 14
export const START_MONEY = 6_000
export const REFUND_RATE = 0.35

export type Terrain = 'water' | 'shore' | 'land' | 'slope'
export type BuildKind = 'road' | 'home' | 'shop' | 'factory' | 'park' | 'power'
export type Tool = BuildKind | 'bulldoze'
export type Demand = 'want' | 'ok' | 'full'

export interface Cell {
  c: number
  r: number
  kind: BuildKind
  stage: number
  age: number
}

export interface GameState {
  seed: number
  day: number
  money: number
  cells: Cell[]
  /** 1 = 正常, 3 = 快 */
  speed: 1 | 3
  paused: boolean
  lastDelta: number
  broke: boolean
}

export const COST: Record<BuildKind, number> = {
  road: 30,
  home: 480,
  shop: 560,
  factory: 820,
  park: 160,
  power: 980,
}

export const UPKEEP: Record<BuildKind, number> = {
  road: 1,
  home: 4,
  shop: 6,
  factory: 9,
  park: 2,
  power: 14,
}

export const HOME_POP = [0, 18, 42, 74]
export const HOME_TAX = [0, 14, 32, 56]
export const SHOP_JOBS = [0, 8, 18, 30]
export const SHOP_INCOME = [0, 20, 42, 64]
export const FACTORY_JOBS = [0, 14, 26, 40]
export const FACTORY_INCOME = [0, 26, 48, 72]

export const BUILD_KINDS: BuildKind[] = ['road', 'home', 'shop', 'factory', 'park', 'power']

export function isBuildKind(value: unknown): value is BuildKind {
  return typeof value === 'string' && (BUILD_KINDS as string[]).includes(value)
}
