/** Olympic-style plate math for HK gyms (kg). Per-side greedy load. */

export const COMMON_BAR_KG = [20, 15] as const
export const PLATE_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const

export type PlateStack = {
  barKg: number
  totalKg: number
  sideKg: number
  /** plates on ONE side, largest first */
  plates: number[]
  remainder: number
  exact: boolean
  tooLight: boolean
}

/** Greedy stack each side so bar + 2×side ≈ totalKg */
export function stackPlates(totalKg: number, barKg = 20): PlateStack {
  const total = Math.round(Number(totalKg) * 100) / 100
  const bar = barKg
  if (!Number.isFinite(total) || total <= 0) {
    return { barKg: bar, totalKg: total, sideKg: 0, plates: [], remainder: 0, exact: false, tooLight: true }
  }
  if (total < bar) {
    return {
      barKg: bar,
      totalKg: total,
      sideKg: 0,
      plates: [],
      remainder: total - bar,
      exact: false,
      tooLight: true,
    }
  }
  let side = Math.round(((total - bar) / 2) * 100) / 100
  const plates: number[] = []
  let rem = side
  for (const p of PLATE_KG) {
    while (rem + 1e-9 >= p) {
      plates.push(p)
      rem = Math.round((rem - p) * 100) / 100
    }
  }
  return {
    barKg: bar,
    totalKg: total,
    sideKg: side,
    plates,
    remainder: rem,
    exact: rem < 0.05,
    tooLight: false,
  }
}

/** e.g. 「槓 20 · 每邊 20+10+2.5」 */
export function formatPlateHint(stack: PlateStack): string {
  if (stack.tooLight) {
    return `要至少 ${stack.barKg} kg（淨槓）`
  }
  if (stack.plates.length === 0) {
    return `淨槓 ${stack.barKg} kg`
  }
  const side = stack.plates.map((p) => (Number.isInteger(p) ? String(p) : String(p))).join('+')
  const base = `槓 ${stack.barKg} · 每邊 ${side}`
  if (!stack.exact && stack.remainder > 0.05) {
    return `${base}（差約 ${stack.remainder} kg／邊）`
  }
  return base
}
