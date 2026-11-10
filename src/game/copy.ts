import type { Demand } from './types'
import type { Tool } from './types'

export const TOOLS: { id: Tool; label: string }[] = [
  { id: 'road', label: '路' },
  { id: 'home', label: '住宅' },
  { id: 'shop', label: '街舖' },
  { id: 'factory', label: '工業' },
  { id: 'park', label: '休憩' },
  { id: 'power', label: '電箱' },
  { id: 'bulldoze', label: '拆' },
]

export function formatMoney(value: number): string {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}$${Math.abs(rounded).toLocaleString('en-HK')}`
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value)
  if (rounded > 0) return `+${formatMoney(rounded)}`
  if (rounded < 0) return formatMoney(rounded)
  return formatMoney(0)
}

export function demandLine(kind: 'home' | 'shop' | 'factory', demand: Demand): string {
  const name = kind === 'home' ? '住宅' : kind === 'shop' ? '街舖' : '工業'
  const word = demand === 'want' ? '想多啲' : demand === 'full' ? '多咗' : '夠'
  return `${name} ${word}`
}
