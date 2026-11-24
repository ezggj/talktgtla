import type { Market } from './markets'

export const STARTING_HKD = 1_000_000
export const FEE_RATE = 0.0004
export const MAX_LEVERAGE = 500
export const MIN_NOTIONAL = 100

export type Side = 'long' | 'short'

export interface Position {
  symbol: string
  side: Side
  qty: number
  entry: number
  /** First fill price. Stays put when later adds change the average entry. */
  firstEntry?: number
  margin: number
  openedAt: number
}

export interface WorkingOrder {
  id: string
  symbol: string
  side: Side
  notional: number
  leverage: number
  limit: number
  at: number
}

export interface Fill {
  id: string
  symbol: string
  side: Side
  action: 'open' | 'close' | 'liq'
  qty: number
  price: number
  pnl: number
  at: number
}

export interface Account {
  cash: number
  positions: Position[]
  orders: WorkingOrder[]
  fills: Fill[]
  streak: number
}

export type TradeError = 'price' | 'size' | 'leverage' | 'cash'

export interface TradeInput {
  symbol: string
  side: Side
  notional: number
  leverage: number
  price: number | null
}

export type TradeResult = { ok: true; account: Account; fill: Fill } | { ok: false; error: TradeError }

export interface SettleEvent {
  kind: 'fill' | 'liq' | 'reject'
  symbol: string
  pnl: number
}

let seq = 0

function nid(now: number): string {
  seq += 1
  return `${now.toString(36)}-${seq}`
}

export function freshAccount(): Account {
  return { cash: STARTING_HKD, positions: [], orders: [], fills: [], streak: 0 }
}

export function movePct(position: Position, mark: number): number {
  if (!(position.entry > 0)) return 0
  const raw = ((mark - position.entry) / position.entry) * 100
  return position.side === 'long' ? raw : -raw
}

export function unrealized(position: Position, mark: number): number {
  const sign = position.side === 'long' ? 1 : -1
  return sign * position.qty * (mark - position.entry)
}

export function positionEquity(position: Position, mark: number): number {
  return position.margin + unrealized(position, mark)
}

export function liquidationPrice(position: Position): number {
  const move = position.margin / position.qty
  return position.side === 'long' ? position.entry - move : position.entry + move
}

export function isLiquidated(position: Position, mark: number): boolean {
  return positionEquity(position, mark) <= 1e-6
}

export function effectiveLeverage(position: Position): number {
  if (position.margin <= 0) return MAX_LEVERAGE
  return (position.qty * position.entry) / position.margin
}

export function equity(account: Account, marks: Readonly<Record<string, number | null>>): number {
  let total = account.cash
  for (const position of account.positions) {
    const mark = marks[position.symbol]
    total += position.margin
    if (mark != null) total += unrealized(position, mark)
  }
  return total
}

export function usedMargin(account: Account): number {
  return account.positions.reduce((sum, position) => sum + position.margin, 0)
}

export function unrealizedTotal(account: Account, marks: Readonly<Record<string, number | null>>): number {
  return account.positions.reduce((sum, position) => {
    const mark = marks[position.symbol]
    return mark == null ? sum : sum + unrealized(position, mark)
  }, 0)
}

/** Realised result versus the starting million, excluding still-open moves. */
export function realizedPnl(account: Account, marks: Readonly<Record<string, number | null>>): number {
  return equity(account, marks) - unrealizedTotal(account, marks) - STARTING_HKD
}

function pushFill(account: Account, fill: Fill): Account {
  return { ...account, fills: [fill, ...account.fills].slice(0, 40) }
}

function validate(input: TradeInput): TradeError | null {
  if (input.price == null || !Number.isFinite(input.price) || input.price <= 0) return 'price'
  if (!Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > MAX_LEVERAGE) return 'leverage'
  if (!Number.isFinite(input.notional) || input.notional < MIN_NOTIONAL) return 'size'
  return null
}

function feeFor(notional: number): number {
  return notional * FEE_RATE
}

export function trade(account: Account, input: TradeInput, now = Date.now()): TradeResult {
  const error = validate(input)
  if (error) return { ok: false, error }
  const price = input.price as number
  const existing = account.positions.find((position) => position.symbol === input.symbol)
  if (!existing || existing.side === input.side) return addTo(account, input, price, existing, now)
  return reduceOrFlip(account, existing, input, price, now)
}

function addTo(
  account: Account,
  input: TradeInput,
  price: number,
  existing: Position | undefined,
  now: number,
): TradeResult {
  const qty = input.notional / price
  const margin = input.notional / input.leverage
  const fee = feeFor(input.notional)
  if (account.cash + 1e-6 < margin + fee) return { ok: false, error: 'cash' }
  const next: Position = existing
    ? {
        ...existing,
        qty: existing.qty + qty,
        entry: (existing.qty * existing.entry + qty * price) / (existing.qty + qty),
        firstEntry: existing.firstEntry ?? existing.entry,
        margin: existing.margin + margin,
      }
    : { symbol: input.symbol, side: input.side, qty, entry: price, firstEntry: price, margin, openedAt: now }
  const fill: Fill = {
    id: nid(now),
    symbol: input.symbol,
    side: input.side,
    action: 'open',
    qty,
    price,
    pnl: -fee,
    at: now,
  }
  const positions = existing
    ? account.positions.map((position) => (position.symbol === input.symbol ? next : position))
    : [...account.positions, next]
  return { ok: true, account: pushFill({ ...account, cash: account.cash - margin - fee, positions }, fill), fill }
}

function reduceOrFlip(account: Account, existing: Position, input: TradeInput, price: number, now: number): TradeResult {
  const orderQty = input.notional / price
  const closeQty = Math.min(existing.qty, orderQty)
  const full = existing.qty - closeQty <= Math.max(1e-8, existing.qty * 1e-8)
  const portion = full ? 1 : closeQty / existing.qty
  const released = existing.margin * portion
  const pnl = (existing.side === 'long' ? 1 : -1) * closeQty * (price - existing.entry)
  const closeFee = closeQty * price * FEE_RATE
  const remainder = full ? 0 : orderQty - closeQty
  const cashAfter = account.cash + released + pnl - closeFee
  const remNotional = remainder * price
  const remMargin = remainder > 1e-9 ? remNotional / input.leverage : 0
  const remFee = remainder > 1e-9 ? feeFor(remNotional) : 0
  if (cashAfter + 1e-6 < remMargin + remFee) return { ok: false, error: 'cash' }

  const closeFill: Fill = {
    id: nid(now),
    symbol: existing.symbol,
    side: existing.side,
    action: 'close',
    qty: closeQty,
    price,
    pnl: pnl - closeFee,
    at: now,
  }
  let next = pushFill(
    {
      ...account,
      cash: cashAfter,
      positions: account.positions.filter((position) => position.symbol !== existing.symbol),
      streak: pnl - closeFee > 0 ? account.streak + 1 : 0,
    },
    closeFill,
  )
  if (remainder <= 1e-9) return { ok: true, account: next, fill: closeFill }
  const opened = addTo(next, { ...input, notional: remNotional, price }, price, undefined, now)
  if (!opened.ok) return opened
  return { ok: true, account: opened.account, fill: opened.fill }
}

export function placeLimit(account: Account, input: TradeInput & { limit: number }, now = Date.now()): TradeResult {
  const error = validate({ ...input, price: input.limit })
  if (error) return { ok: false, error }
  if (!Number.isFinite(input.limit) || input.limit <= 0) return { ok: false, error: 'price' }
  const order: WorkingOrder = {
    id: nid(now),
    symbol: input.symbol,
    side: input.side,
    notional: input.notional,
    leverage: input.leverage,
    limit: input.limit,
    at: now,
  }
  const fill: Fill = {
    id: order.id,
    symbol: input.symbol,
    side: input.side,
    action: 'open',
    qty: 0,
    price: input.limit,
    pnl: 0,
    at: now,
  }
  return {
    ok: true,
    account: {
      ...account,
      orders: [...account.orders.filter((item) => item.symbol !== input.symbol), order],
    },
    fill,
  }
}

export function cancelOrder(account: Account, symbol: string): Account {
  return { ...account, orders: account.orders.filter((order) => order.symbol !== symbol) }
}

function crossed(order: WorkingOrder, mark: number): boolean {
  return order.side === 'long' ? mark <= order.limit : mark >= order.limit
}

export function settle(
  account: Account,
  marks: Readonly<Record<string, number | null>>,
  live: boolean,
  now = Date.now(),
): { account: Account; events: SettleEvent[] } {
  if (!live) return { account, events: [] }
  let current = account
  const events: SettleEvent[] = []
  for (const order of account.orders) {
    const mark = marks[order.symbol]
    if (mark == null || !crossed(order, mark)) continue
    current = { ...current, orders: current.orders.filter((item) => item.id !== order.id) }
    const filled = trade(
      current,
      { symbol: order.symbol, side: order.side, notional: order.notional, leverage: order.leverage, price: mark },
      now,
    )
    if (!filled.ok) {
      events.push({ kind: 'reject', symbol: order.symbol, pnl: 0 })
      continue
    }
    current = filled.account
    events.push({ kind: 'fill', symbol: order.symbol, pnl: filled.fill.pnl })
  }
  for (const position of [...current.positions]) {
    const mark = marks[position.symbol]
    if (mark == null || !isLiquidated(position, mark)) continue
    const loss = -position.margin
    const fill: Fill = {
      id: nid(now),
      symbol: position.symbol,
      side: position.side,
      action: 'liq',
      qty: position.qty,
      price: mark,
      pnl: loss,
      at: now,
    }
    current = pushFill(
      {
        ...current,
        positions: current.positions.filter((item) => item.symbol !== position.symbol),
        streak: 0,
      },
      fill,
    )
    events.push({ kind: 'liq', symbol: position.symbol, pnl: loss })
  }
  return { account: current, events }
}

export function marketName(symbol: string, markets: readonly Market[]): string {
  return markets.find((market) => market.symbol === symbol)?.name ?? symbol
}
