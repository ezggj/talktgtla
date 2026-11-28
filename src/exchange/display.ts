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

/** Presentational only. The book itself stays in HKD. */
export function formatDisplay(hkd: number, ccy: DisplayCcy, fx: number | null): string {
  const shown = toDisplay(hkd, ccy, fx)
  if (shown == null) return ccy === 'USD' ? '匯率未到' : '—'
  const abs = Math.abs(shown)
  const digits = abs === 0 || abs >= 1000 ? 0 : 2
  const body = abs.toLocaleString('en-HK', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const unit = ccy === 'USD' ? 'US$' : 'HK$'
  return `${shown < 0 ? '-' : ''}${unit}${body}`
}
