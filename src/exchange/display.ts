export type DisplayCcy = 'HKD' | 'USD'

/** HKD per 1 USD, from the public HKD=X quote. */
export function toDisplay(hkd: number, ccy: DisplayCcy, fx: number | null): number | null {
  if (!Number.isFinite(hkd)) return null
  if (ccy === 'HKD') return hkd
  if (fx == null || !Number.isFinite(fx) || fx <= 0) return null
  return hkd / fx
}

export function fromDisplay(amount: number, ccy: DisplayCcy, fx: number | null): number | null {
  if (!Number.isFinite(amount)) return null
  if (ccy === 'HKD') return amount
  if (fx == null || !Number.isFinite(fx) || fx <= 0) return null
  return amount * fx
}
