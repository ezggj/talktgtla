import type { MealMacros } from './storage'

/** HK-flavoured demo estimates for UI when no AI yet */
export const HK_DISH_ESTIMATES: {
  name: string
  hint: string
  macros: MealMacros
}[] = [
  {
    name: '叉燒飯',
    hint: '茶記經典 · 大約一份',
    macros: { kcal: 680, protein: 32, carbs: 78, fat: 24, fiber: 3 },
  },
  {
    name: '雞胸便當',
    hint: '健身友好 · 配菜視乎',
    macros: { kcal: 420, protein: 48, carbs: 35, fat: 10, fiber: 6 },
  },
  {
    name: '蛋治 + 咖啡',
    hint: '早餐輕食',
    macros: { kcal: 380, protein: 18, carbs: 32, fat: 18, fiber: 2 },
  },
  {
    name: '蛋白粉奶昔',
    hint: '一勺乳清 + 牛奶',
    macros: { kcal: 220, protein: 28, carbs: 12, fat: 5, fiber: 0 },
  },
  {
    name: '燒味雙拼飯',
    hint: '燒鴨 + 叉燒',
    macros: { kcal: 820, protein: 38, carbs: 85, fat: 34, fiber: 3 },
  },
  {
    name: '番茄肉醬意粉',
    hint: '西式簡餐',
    macros: { kcal: 560, protein: 26, carbs: 72, fat: 16, fiber: 5 },
  },
]

export function mockEstimateFromFile(fileName: string): { name: string; macros: MealMacros } {
  const lower = fileName.toLowerCase()
  const hit = HK_DISH_ESTIMATES.find((d) =>
    d.name.split('').some((ch) => lower.includes(ch)) ||
    lower.includes('chicken') ||
    lower.includes('rice') ||
    lower.includes('protein')
  )
  if (lower.includes('protein') || lower.includes('shake')) {
    return { name: '蛋白粉奶昔', macros: HK_DISH_ESTIMATES[3].macros }
  }
  if (lower.includes('chicken')) {
    return { name: '雞胸便當', macros: HK_DISH_ESTIMATES[1].macros }
  }
  // rotate by name hash for variety
  const idx = Math.abs([...fileName].reduce((a, c) => a + c.charCodeAt(0), 0)) % HK_DISH_ESTIMATES.length
  const dish = hit ?? HK_DISH_ESTIMATES[idx]
  // slight jitter so it feels estimated
  const jitter = (n: number) => Math.round(n * (0.92 + (idx % 5) * 0.02))
  return {
    name: dish.name,
    macros: {
      kcal: jitter(dish.macros.kcal),
      protein: jitter(dish.macros.protein),
      carbs: jitter(dish.macros.carbs),
      fat: jitter(dish.macros.fat),
      fiber: dish.macros.fiber,
    },
  }
}

export function scaleMacros(m: MealMacros, portion: number): MealMacros {
  const s = (n: number) => Math.round(n * portion)
  return {
    kcal: s(m.kcal),
    protein: s(m.protein),
    carbs: s(m.carbs),
    fat: s(m.fat),
    fiber: m.fiber != null ? s(m.fiber) : undefined,
  }
}
