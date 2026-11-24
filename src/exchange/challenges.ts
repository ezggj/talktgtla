import { STARTING_HKD } from './book'

export interface Standing {
  nickname: string
  equityHkd: number
  peakHkd: number
  weekPnlHkd: number
}

export function drawdown(row: Standing): number {
  if (row.peakHkd <= 0) return 0
  return Math.max(0, (row.peakHkd - row.equityHkd) / row.peakHkd)
}

export function rankWeekProfit(rows: readonly Standing[]): Standing[] {
  return [...rows].sort((a, b) => b.weekPnlHkd - a.weekPnlHkd || a.nickname.localeCompare(b.nickname, 'zh-HK'))
}

/** Still above the starting million, smallest peak-to-now drop first. */
export function rankSteady(rows: readonly Standing[]): Standing[] {
  return rows
    .filter((row) => row.equityHkd > STARTING_HKD)
    .sort((a, b) => drawdown(a) - drawdown(b) || b.weekPnlHkd - a.weekPnlHkd)
}

export function hongKongDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Monday date in Hong Kong, as YYYY-MM-DD. */
export function hongKongWeek(now: Date): string {
  const day = hongKongDay(now)
  const [year, month, date] = day.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, date))
  const weekday = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() - (weekday - 1))
  return utc.toISOString().slice(0, 10)
}
