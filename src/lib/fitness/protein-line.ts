/** Spoken protein lines for the eat screen. */

export function remainingProteinLine(eaten: number, goal: number): string {
  const left = Math.max(0, Math.round(goal) - Math.round(eaten))
  if (left <= 0) return '今日夠喇 ✅'
  return `仲差 ${left}g protein`
}

export function todayProteinTotalLine(eaten: number, goal: number): string {
  return `今日 protein ${Math.round(eaten)} / ${Math.round(goal)}g`
}

export function proteinNudgeLine(left: number): string {
  return `仲差 ${Math.max(0, Math.round(left))}g — 打杯 whey？定加舊雞胸？`
}
