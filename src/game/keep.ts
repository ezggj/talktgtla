import { cityEvent } from './events'
import type { GameState, Tool } from './types'
import { typhoonSignal } from './weather'

/** The tool a goal asks for, so a narrow screen can keep it on the first row. */
export function goalTool(id: string): Tool | null {
  if (id === 'tram') return 'tram'
  if (id === 'wc' || id === 'cwb') return 'mtr'
  if (id === 'pop' || id === 'pop2') return 'home'
  if (id === 'ferry') return 'ferry'
  if (id === 'bus') return 'bus'
  if (id === 'factory') return 'factory'
  return null
}

export interface KeepSnap {
  pop: number
  ferries: number
  trams: number
  mtrLinked: number
  busLinked: number
  signal: 0 | 1 | 3 | 8
  jam: 'none' | 'road' | 'harbour' | 'bus'
  eventCopy: string | null
  shops: number
  homes: number
  factories: number
  parks: number
}

export interface Goal {
  id: string
  text: string
}

const GOALS: { id: string; text: string; done: (state: GameState, snap: KeepSnap) => boolean }[] = [
  { id: 'tram', text: '將電車駁去銅鑼灣', done: (state) => (state.trams ?? []).includes('t-cwb') },
  { id: 'wc', text: '港島綫駁到灣仔', done: (state) => (state.stations ?? []).includes('wc') },
  { id: 'pop', text: '人口去到 300', done: (_state, snap) => snap.pop >= 300 },
  { id: 'ferry', text: '開一條離島船', done: (_state, snap) => snap.ferries >= 2 },
  { id: 'eight', text: '捱過下一個八號', done: (state, snap) => state.sawEight && snap.signal < 8 },
  { id: 'pop2', text: '人口去到 500', done: (_state, snap) => snap.pop >= 500 },
  { id: 'cwb', text: '港島綫駁到銅鑼灣', done: (state) => (state.stations ?? []).includes('cwb') },
  { id: 'bus', text: '同一條路開兩個巴士站', done: (_state, snap) => snap.busLinked >= 2 },
  {
    id: 'factory',
    text: '起一間有人做嘅廠',
    done: (state) => state.cells.some((cell) => cell.kind === 'factory' && cell.stage >= 1),
  },
]

export function nextGoal(state: GameState, snap: KeepSnap): Goal {
  const goal = GOALS.find((item) => !item.done(state, snap))
  return goal ? { id: goal.id, text: goal.text } : { id: 'rest', text: '暫時冇新目標，繼續起你座城。' }
}

export function cityNickname(state: GameState, snap: KeepSnap): string {
  const trams = state.trams ?? []
  if (snap.ferries >= 2 && snap.mtrLinked >= 2) return '過海之城'
  if (trams.length >= 4) return '電車之城'
  if (snap.mtrLinked >= 4) return '港鐵之城'
  if (snap.busLinked >= 2) return '巴士之城'
  if (snap.shops >= 3 && snap.shops >= snap.homes) return '街舖之城'
  if (snap.factories >= 2) return '工廠之城'
  if (snap.parks >= 3) return '公園之城'
  if (snap.ferries >= 1) return '維港之城'
  return '起步之城'
}

export function todayStory(snap: KeepSnap, finished: string | null): string {
  if (finished) return `今日做到：${finished}`
  if (snap.signal >= 8) return '今日掛八號，大家留喺屋企。'
  if (snap.signal >= 3) return '今日有風球，離島船停。'
  if (snap.signal === 1) return '今日掛一號，落雨。'
  if (snap.eventCopy) return snap.eventCopy
  if (snap.jam === 'harbour') return '今日過海塞車。'
  if (snap.jam !== 'none') return '今日有路塞住。'
  return '今日城好靜，適合起樓。'
}

export function tomorrowLine(day: number, seed: number, harbourOpen: boolean): string {
  const tomorrow = Math.floor(day) + 1
  const morning = tomorrow + 0.3
  const event = cityEvent(morning, 0)
  if (event === 'newyear') return '新年就到，舖頭會旺。'
  if (event === 'autumn') return '聽日中秋，人會去公園。'
  if (event === 'burst') return '聽日可能爆水管，留條後路。'
  if (event === 'delay') return '聽日港鐵可能延誤。'
  const signal = typhoonSignal(morning, seed)
  if (event === 'rain' && signal === 0) return '聽日可能突然落大雨。'
  if (signal >= 8) return '聽日可能掛八號，船同巴士會停。'
  if (signal >= 1) return '聽日有風球，先做好準備。'
  if (typhoonSignal(tomorrow + 1.4, seed) >= 1) return '後日可能有風球。'
  if (!harbourOpen) return '聽日朝早過海會塞。'
  return '聽日朝早人多，路會擠少少。'
}

export function snapOf(summary: {
  pop: number
  ferries: number
  trams: number
  mtrLinked: number
  busLinked: number
  signal: 0 | 1 | 3 | 8
  jam: KeepSnap['jam']
  eventCopy: string | null
  counts: { shop: number; home: number; factory: number; park: number }
}): KeepSnap {
  return {
    pop: summary.pop,
    ferries: summary.ferries,
    trams: summary.trams,
    mtrLinked: summary.mtrLinked,
    busLinked: summary.busLinked,
    signal: summary.signal,
    jam: summary.jam,
    eventCopy: summary.eventCopy,
    shops: summary.counts.shop,
    homes: summary.counts.home,
    factories: summary.counts.factory,
    parks: summary.counts.park,
  }
}
