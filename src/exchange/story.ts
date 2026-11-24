export interface Move {
  name: string
  pct: number | null
}

/** One spoken line from real percentage moves. No invented news. */
export function marketLine(moves: readonly Move[]): string {
  const known = moves.filter((move): move is { name: string; pct: number } => move.pct != null && Number.isFinite(move.pct))
  if (!known.length) return '報價暫時攞唔到，市況暫停。'
  const top = known.reduce((best, move) => (Math.abs(move.pct) > Math.abs(best.pct) ? move : best))
  if (Math.abs(top.pct) < 0.05) return '今日個市好靜。'
  const dir = top.pct > 0 ? '升' : '跌'
  return `${top.name}而家${dir} ${Math.abs(top.pct).toFixed(1)}%，係今日郁得最多。`
}

/** One or two sentences, only from the percentages on the desk. */
export function deskHighlight(moves: readonly Move[]): string {
  const line = marketLine(moves)
  const known = moves.filter((move): move is { name: string; pct: number } => move.pct != null && Number.isFinite(move.pct))
  if (known.length < 2) return line
  const sorted = [...known].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  const second = sorted[1]
  if (Math.abs(second.pct) < 0.05) return line
  const dir = second.pct > 0 ? '升' : '跌'
  return `${line} ${second.name}就${dir} ${Math.abs(second.pct).toFixed(1)}%。`
}

export function streakLine(streak: number): string | null {
  if (streak >= 2) return `連續 ${streak} 單賺到。`
  return null
}

export function leverageWarning(leverage: number): string {
  const move = 100 / leverage
  const digits = move >= 1 ? 1 : 2
  return `${leverage} 倍，價格郁 ${move.toFixed(digits)}% 就爆倉。`
}
