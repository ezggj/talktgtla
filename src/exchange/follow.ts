import type { Side } from './book'

export interface DemoTrader {
  id: 'trend' | 'fade'
  name: string
  note: string
}

export const DEMO_TRADERS: readonly DemoTrader[] = [
  { id: 'trend', name: '示範甲', note: '今日升就開多，跌就開空。模擬示範，唔係真人。' },
  { id: 'fade', name: '示範乙', note: '今日升就開空。模擬示範，唔係真人。' },
]

export function demoSide(id: DemoTrader['id'], dayPct: number): Side {
  if (id === 'trend') return dayPct >= 0 ? 'long' : 'short'
  return dayPct >= 0 ? 'short' : 'long'
}
