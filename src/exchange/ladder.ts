export interface LadderLevel {
  price: number
  size: number
}

/** A visual ladder around the last public price. Sizes are decorative, not a real order book. */
export function referenceLadder(price: number, steps = 5): { asks: LadderLevel[]; bids: LadderLevel[] } | null {
  if (!Number.isFinite(price) || price <= 0) return null
  const step = price * 0.0008
  const asks: LadderLevel[] = []
  const bids: LadderLevel[] = []
  for (let i = steps; i >= 1; i -= 1) {
    asks.push({ price: price + step * i, size: Number((0.4 + i * 0.17).toFixed(2)) })
  }
  for (let i = 1; i <= steps; i += 1) {
    bids.push({ price: price - step * i, size: Number((0.35 + i * 0.15).toFixed(2)) })
  }
  return { asks, bids }
}
