import { cellKey } from './map'
import { hash2 } from './rng'
import type { Cell } from './types'

export interface Walker {
  c: number
  r: number
  nc: number
  nr: number
  t: number
  speed: number
  shirt: string
  kind: 'person' | 'van'
}

const SHIRTS = ['#f2efe6', '#e07a4a', '#3d8ea0', '#d4566a', '#efd27a', '#6ea36a']

export function syncWalkers(walkers: Walker[], cells: Cell[], seed: number): void {
  const roads = cells.filter((cell) => cell.kind === 'road')
  const target = Math.min(22, Math.floor(roads.length / 2))
  if (!roads.length) {
    walkers.length = 0
    return
  }
  while (walkers.length > target) walkers.pop()
  const roadSet = new Set(roads.map((cell) => cellKey(cell.c, cell.r)))
  for (const walker of walkers) {
    if (!roadSet.has(cellKey(walker.c, walker.r))) {
      const home = roads[Math.floor(Math.random() * roads.length)]
      walker.c = home.c
      walker.r = home.r
      walker.nc = home.c
      walker.nr = home.r
      walker.t = 0
    }
  }
  while (walkers.length < target) {
    const home = roads[walkers.length % roads.length]
    const kind = walkers.length % 5 === 0 ? 'van' : 'person'
    walkers.push({
      c: home.c,
      r: home.r,
      nc: home.c,
      nr: home.r,
      t: hash2(home.c, walkers.length, seed),
      speed: kind === 'van' ? 0.42 : 0.28,
      shirt: SHIRTS[walkers.length % SHIRTS.length],
      kind,
    })
  }
}

export function stepWalkers(walkers: Walker[], cells: Cell[], dtSec: number): void {
  const roadSet = new Set(cells.filter((cell) => cell.kind === 'road').map((cell) => cellKey(cell.c, cell.r)))
  if (!roadSet.size) return
  for (const walker of walkers) {
    if (walker.c === walker.nc && walker.r === walker.nr) pickNext(walker, roadSet)
    walker.t += dtSec * walker.speed
    if (walker.t < 1) continue
    walker.c = walker.nc
    walker.r = walker.nr
    walker.t = 0
    pickNext(walker, roadSet)
  }
}

function pickNext(walker: Walker, roads: Set<string>) {
  const options = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([dc, dr]) => ({ c: walker.c + dc, r: walker.r + dr }))
    .filter((n) => roads.has(cellKey(n.c, n.r)))
  if (!options.length) {
    walker.nc = walker.c
    walker.nr = walker.r
    return
  }
  const next = options[Math.floor(Math.random() * options.length)]
  walker.nc = next.c
  walker.nr = next.r
}
