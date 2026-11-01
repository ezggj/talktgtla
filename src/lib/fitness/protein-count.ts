/** Protein that counts toward a goal. 碟菜／菜心 stay ~1g on the chip, but are not a protein source. */

export function isVegSideMeal(meal: { name?: string | null; note?: string | null }): boolean {
  const name = (meal.name || '').trim()
  if (/^(碟菜|菜心)/.test(name)) return true
  if (meal.note && /唔當蛋白|唔計 protein|蛋白約 1g/.test(meal.note)) return true
  return false
}

export function countableProtein(meal: {
  name?: string | null
  note?: string | null
  macros?: { protein?: number } | null
}): number {
  if (isVegSideMeal(meal)) return 0
  const n = meal.macros?.protein
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

export function proteinThatCounts(
  meals: { name?: string | null; note?: string | null; macros?: { protein?: number } | null }[]
): number {
  return meals.reduce((sum, meal) => sum + countableProtein(meal), 0)
}

export function vegSideProtein(
  meals: { name?: string | null; note?: string | null; macros?: { protein?: number } | null }[]
): number {
  return meals.reduce((sum, meal) => {
    if (!isVegSideMeal(meal)) return sum
    const n = meal.macros?.protein
    return sum + (typeof n === 'number' && Number.isFinite(n) ? n : 0)
  }, 0)
}
