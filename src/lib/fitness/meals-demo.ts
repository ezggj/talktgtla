import type { MealMacros } from './storage'

/** HK-flavoured quick-add presets + demo estimates when AI Gateway unavailable */
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
    hint: '健身友善 · 配菜睇情況',
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
  {
    name: '白切雞飯',
    hint: '茶記 · 皮油睇你',
    macros: { kcal: 620, protein: 36, carbs: 70, fat: 18, fiber: 2 },
  },
  {
    name: '魚蛋粉',
    hint: '街邊小食 · 一碗',
    macros: { kcal: 480, protein: 22, carbs: 62, fat: 14, fiber: 2 },
  },
  {
    name: '雲吞麵',
    hint: '細碗 · 大約 8 粒',
    macros: { kcal: 450, protein: 24, carbs: 58, fat: 12, fiber: 2 },
  },
  {
    name: '三文治套餐',
    hint: '咖啡店 · 連飲品粗估',
    macros: { kcal: 520, protein: 22, carbs: 48, fat: 24, fiber: 3 },
  },
  {
    name: '牛肉飯',
    hint: '茶記 · 滑蛋／炒蛋另計',
    macros: { kcal: 700, protein: 34, carbs: 80, fat: 22, fiber: 2 },
  },
  {
    name: '希臘乳酪水果',
    hint: '高蛋白小食',
    macros: { kcal: 280, protein: 22, carbs: 28, fat: 8, fiber: 3 },
  },
  {
    name: '豬扒飯',
    hint: '茶記 · 一份',
    macros: { kcal: 720, protein: 36, carbs: 82, fat: 26, fiber: 2 },
  },
  {
    name: '咖喱牛腩飯',
    hint: '茶記 · 濃味',
    macros: { kcal: 780, protein: 34, carbs: 88, fat: 30, fiber: 4 },
  },
  {
    name: '水煮魚片飯',
    hint: '清淡啲 · 睇醬汁',
    macros: { kcal: 560, protein: 38, carbs: 70, fat: 12, fiber: 2 },
  },
  {
    name: '麥皮雞蛋',
    hint: '早餐 · 加蛋白更好',
    macros: { kcal: 320, protein: 18, carbs: 36, fat: 10, fiber: 4 },
  },
  {
    name: '壽司拼盤',
    hint: '約 8–10 件粗估',
    macros: { kcal: 480, protein: 24, carbs: 68, fat: 10, fiber: 2 },
  },
  {
    name: '雞翼便當',
    hint: '外賣 · 皮油偏高',
    macros: { kcal: 650, protein: 32, carbs: 55, fat: 32, fiber: 3 },
  },
  {
    name: '沙律雞胸',
    hint: '低脂 · 醬汁另計',
    macros: { kcal: 340, protein: 42, carbs: 18, fat: 10, fiber: 5 },
  },
  {
    name: '牛肉麵',
    hint: '一碗 · 湯底睇油',
    macros: { kcal: 580, protein: 30, carbs: 70, fat: 16, fiber: 3 },
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

/** Extra single items (drinks / snacks) for name-based re-estimate */
const HK_NAME_EXTRA: {
  name: string
  aliases: string[]
  macros: MealMacros
  hint?: string
}[] = [
  {
    name: '黑咖啡',
    aliases: ['咖啡', '美式', '美式咖啡', 'espresso', '意式咖啡', 'americano', 'coffee', 'black coffee'],
    macros: { kcal: 5, protein: 0, carbs: 1, fat: 0, fiber: 0 },
    hint: '無糖無奶 · 一杯',
  },
  {
    name: '港式咖啡',
    aliases: ['茶記咖啡', '咖啡奶', '絲襪咖啡'],
    macros: { kcal: 90, protein: 2, carbs: 12, fat: 3, fiber: 0 },
    hint: '茶記常見 · 有奶糖粗估',
  },
  {
    name: '拿鐵',
    aliases: ['latte', '鮮奶咖啡', 'latte coffee'],
    macros: { kcal: 150, protein: 8, carbs: 12, fat: 7, fiber: 0 },
  },
  {
    name: '卡布奇諾',
    aliases: ['cappuccino', 'capp'],
    macros: { kcal: 120, protein: 6, carbs: 10, fat: 5, fiber: 0 },
  },
  {
    name: '鴛鴦',
    aliases: ['鴛鴦咖啡', '咖啡奶茶'],
    macros: { kcal: 120, protein: 2, carbs: 18, fat: 3, fiber: 0 },
  },
  {
    name: '奶茶',
    aliases: ['港式奶茶', '絲襪奶茶', '茶走'],
    macros: { kcal: 140, protein: 3, carbs: 20, fat: 5, fiber: 0 },
  },
  {
    name: '檸檬茶',
    aliases: ['凍柠茶', '凍檸檬茶', '熱檸檬茶', '柠茶'],
    macros: { kcal: 90, protein: 0, carbs: 22, fat: 0, fiber: 0 },
  },
  {
    name: '水',
    aliases: ['凍水', '開水', '礦泉水', 'water'],
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  },
  {
    name: '蛋治',
    aliases: ['蛋三文治', '雞蛋三文治', 'egg sandwich', '蛋三明治'],
    macros: { kcal: 320, protein: 14, carbs: 28, fat: 16, fiber: 2 },
  },
  {
    name: '火腿蛋治',
    aliases: ['火腿蛋三文治'],
    macros: { kcal: 380, protein: 18, carbs: 30, fat: 20, fiber: 2 },
  },
  {
    name: '香蕉',
    aliases: ['banana'],
    macros: { kcal: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
  },
  {
    name: '蘋果',
    aliases: ['apple'],
    macros: { kcal: 95, protein: 0, carbs: 25, fat: 0, fiber: 4 },
  },
  {
    name: '雞蛋',
    aliases: ['烚蛋', '煎蛋', '炒蛋', 'egg'],
    macros: { kcal: 78, protein: 6, carbs: 1, fat: 5, fiber: 0 },
  },
  {
    name: '雞胸',
    aliases: ['雞胸肉', 'chicken breast'],
    macros: { kcal: 165, protein: 31, carbs: 0, fat: 4, fiber: 0 },
  },
  {
    name: '白飯',
    aliases: ['飯', '米饭', 'rice', '一碗飯'],
    macros: { kcal: 200, protein: 4, carbs: 45, fat: 0, fiber: 1 },
  },
  {
    name: '蔬菜沙律',
    aliases: ['沙律', 'salad', '綠沙律'],
    macros: { kcal: 80, protein: 3, carbs: 10, fat: 3, fiber: 4 },
  },
]

export type NameEstimateResult = {
  name: string
  macros: MealMacros
  confidence: number
  note: string
  matched: string[]
  source: 'table'
}

function normalizeFoodToken(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/（.*?）|\(.*?\)/g, '')
}

function splitFoodNameParts(raw: string): string[] {
  const cleaned = raw
    .replace(/[，,]/g, '、')
    .replace(/\s+and\s+/gi, '、')
  return cleaned
    .split(/同|\+|及|和|、|＆|&|／|\/|跟|連|with/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

type CatalogItem = { name: string; aliases: string[]; macros: MealMacros }

function buildCatalog(): CatalogItem[] {
  const fromDishes: CatalogItem[] = HK_DISH_ESTIMATES.map((d) => ({
    name: d.name,
    aliases: [d.name, ...d.name.split(/[+＋]/).map((x) => x.trim()).filter(Boolean)],
    macros: d.macros,
  }))
  return [...HK_NAME_EXTRA, ...fromDishes]
}

function matchCatalogItem(part: string, catalog: CatalogItem[]): CatalogItem | null {
  const token = normalizeFoodToken(part)
  if (!token) return null

  // Exact name / alias
  for (const item of catalog) {
    const names = [item.name, ...item.aliases].map(normalizeFoodToken)
    if (names.includes(token)) return item
  }

  // Contains: longer alias first
  let best: { item: CatalogItem; score: number } | null = null
  for (const item of catalog) {
    for (const alias of [item.name, ...item.aliases]) {
      const a = normalizeFoodToken(alias)
      if (!a || a.length < 2) continue
      if (token.includes(a) || a.includes(token)) {
        const score = Math.min(token.length, a.length) / Math.max(token.length, a.length)
        if (!best || score > best.score || (score === best.score && a.length > normalizeFoodToken(best.item.name).length)) {
          best = { item, score }
        }
      }
    }
  }
  if (best && best.score >= 0.45) return best.item
  return null
}

function sumMealMacros(list: MealMacros[]): MealMacros {
  return list.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
      fiber: (a.fiber || 0) + (m.fiber || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

/**
 * Estimate macros from an edited Cantonese / food name (no photo).
 * Splits on 同 / + / 及 etc. and sums matched HK table rows.
 */
export function estimateFromFoodName(rawName: string): NameEstimateResult | null {
  const name = rawName.trim().slice(0, 64)
  if (!name || name === '認緊碟餸…' || name === '自己改碟餸') return null

  const catalog = buildCatalog()
  const parts = splitFoodNameParts(name)
  const matched: CatalogItem[] = []
  const unmatched: string[] = []

  for (const part of parts.length ? parts : [name]) {
    const hit = matchCatalogItem(part, catalog)
    if (hit) matched.push(hit)
    else unmatched.push(part)
  }

  if (matched.length === 0) {
    // whole-string fuzzy against dish names
    const whole = matchCatalogItem(name, catalog)
    if (!whole) return null
    matched.push(whole)
  }

  const macros = sumMealMacros(matched.map((m) => m.macros))
  const labels = matched.map((m) => m.name)
  const coverage = matched.length / Math.max(1, parts.length || 1)
  const confidence = Math.max(0.35, Math.min(0.95, 0.55 + coverage * 0.35 - unmatched.length * 0.12))

  const noteParts = [
    `按「${name}」對照港式表重估`,
    labels.length ? `對到：${labels.join('、')}` : null,
    unmatched.length ? `未對到：${unmatched.join('、')}（未計入）` : null,
  ].filter(Boolean)

  return {
    name,
    macros: {
      kcal: Math.round(macros.kcal),
      protein: Math.round(macros.protein),
      carbs: Math.round(macros.carbs),
      fat: Math.round(macros.fat),
      fiber: macros.fiber != null ? Math.round(macros.fiber) : undefined,
    },
    confidence,
    note: noteParts.join(' · ').slice(0, 80),
    matched: labels,
    source: 'table',
  }
}
