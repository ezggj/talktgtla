export type Rush = 'morning' | 'evening' | 'calm'
export type JamKind = 'none' | 'road' | 'harbour' | 'bus'

export function dayFraction(day: number): number {
  return ((day % 1) + 1) % 1
}

/** Morning peak covers 朝早 into the start of 日頭. Evening covers 下晝 into 黃昏. */
export function rushOf(day: number): Rush {
  const t = dayFraction(day)
  if (t >= 0.22 && t < 0.36) return 'morning'
  if (t >= 0.66 && t < 0.8) return 'evening'
  return 'calm'
}

export function nightOf(day: number): boolean {
  const t = dayFraction(day)
  return t >= 0.8 || t < 0.18
}

export function jamCopy(kind: JamKind): string | null {
  if (kind === 'harbour') return '過海塞車，開船或者駁過海綫。'
  if (kind === 'bus') return '巴士掛卡，條路疏咗先順。'
  if (kind === 'road') return '條路塞住，加巴士或者港鐵。'
  return null
}

/** Extra fare when people are moving and the network is keeping up. */
export function rushBonus(pop: number, rush: Rush, jam: JamKind, transit: boolean): number {
  if (rush === 'calm' || jam !== 'none' || !transit || pop < 40) return 0
  return Math.round(pop * 0.06)
}

export function jamShopMul(jam: JamKind): number {
  if (jam === 'none') return 1
  return 0.72
}
