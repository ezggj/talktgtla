export const BOARD_START_HKD = 1_000_000

export interface BoardRow {
  nickname: string
  equityHkd: number
}

export function cleanNick(raw: string): string | null {
  const nick = raw.trim().replace(/\s+/g, '')
  if (nick.length < 1 || nick.length > 12) return null
  if (nick.includes('@')) return null
  return nick
}

export function lossHkd(equityHkd: number, start = BOARD_START_HKD): number {
  return start - equityHkd
}

/** Most virtual money lost versus the starting million. */
export function rankLosses(rows: readonly BoardRow[]): BoardRow[] {
  return [...rows].sort((a, b) => lossHkd(b.equityHkd) - lossHkd(a.equityHkd) || a.nickname.localeCompare(b.nickname, 'zh-HK'))
}

/** Highest equity first. */
export function rankGains(rows: readonly BoardRow[]): BoardRow[] {
  return [...rows].sort((a, b) => b.equityHkd - a.equityHkd || a.nickname.localeCompare(b.nickname, 'zh-HK'))
}

export function canPublishRank(userId: string | null | undefined): boolean {
  return Boolean(userId)
}

/**
 * Do not replace a played cloud balance with a fresh local million.
 * If this device has already traded, the board follows this device.
 */
export function mergeStanding(
  localEquity: number,
  localTraded: boolean,
  serverEquity: number | null,
): { equityHkd: number; note: 'local' | 'kept-server' } {
  if (serverEquity == null) return { equityHkd: localEquity, note: 'local' }
  if (!localTraded && Math.abs(localEquity - BOARD_START_HKD) < 1 && Math.abs(serverEquity - localEquity) >= 1) {
    return { equityHkd: serverEquity, note: 'kept-server' }
  }
  return { equityHkd: localEquity, note: 'local' }
}
