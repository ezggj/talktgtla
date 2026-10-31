import type { MealMacros } from './storage'

/** HK-flavoured quick-add presets + demo estimates when AI Gateway unavailable */

export type DishCategory = '茶記' | 'gym撚常食' | '小食' | '早餐' | '補劑'

export const DISH_CATEGORY_LABEL: Record<DishCategory, string> = {
  '茶記': '茶記／街坊',
  'gym撚常食': 'gym撚常食',
  '小食': '高蛋白小食',
  '早餐': '早餐',
  '補劑': '補劑／乳清',
}

export const HK_DISH_ESTIMATES: {
  name: string
  hint: string
  macros: MealMacros
  category: DishCategory
}[] = [
  {
    name: '叉燒飯',
    hint: '茶記經典 · 大約一份',
    macros: { kcal: 680, protein: 32, carbs: 78, fat: 24, fiber: 3 },
    category: '茶記',
  },
  {
    name: '雞胸便當',
    hint: '健身友善 · 配菜睇情況',
    macros: { kcal: 420, protein: 48, carbs: 35, fat: 10, fiber: 6 },
    category: 'gym撚常食',
  },
  {
    name: '蛋治 + 咖啡',
    hint: '早餐輕食',
    macros: { kcal: 380, protein: 18, carbs: 32, fat: 18, fiber: 2 },
    category: '早餐',
  },
  {
    name: '蛋白粉奶昔',
    hint: '一勺乳清 + 牛奶',
    macros: { kcal: 220, protein: 28, carbs: 12, fat: 5, fiber: 0 },
    category: '小食',
  },
  {
    name: '燒味雙拼飯',
    hint: '燒鴨 + 叉燒',
    macros: { kcal: 820, protein: 38, carbs: 85, fat: 34, fiber: 3 },
    category: '茶記',
  },
  {
    name: '番茄肉醬意粉',
    hint: '西式簡餐',
    macros: { kcal: 560, protein: 26, carbs: 72, fat: 16, fiber: 5 },
    category: '茶記',
  },
  {
    name: '白切雞飯',
    hint: '茶記 · 皮油睇你',
    macros: { kcal: 620, protein: 36, carbs: 70, fat: 18, fiber: 2 },
    category: '茶記',
  },
  {
    name: '魚蛋粉',
    hint: '街邊小食 · 一碗',
    macros: { kcal: 480, protein: 22, carbs: 62, fat: 14, fiber: 2 },
    category: '茶記',
  },
  {
    name: '雲吞麵',
    hint: '細碗 · 大約 8 粒',
    macros: { kcal: 450, protein: 24, carbs: 58, fat: 12, fiber: 2 },
    category: '茶記',
  },
  {
    name: '三文治套餐',
    hint: '咖啡店 · 連飲品粗估',
    macros: { kcal: 520, protein: 22, carbs: 48, fat: 24, fiber: 3 },
    category: '早餐',
  },
  {
    name: '牛肉飯',
    hint: '茶記 · 滑蛋／炒蛋另計',
    macros: { kcal: 700, protein: 34, carbs: 80, fat: 22, fiber: 2 },
    category: '茶記',
  },
  {
    name: '希臘乳酪水果',
    hint: '高蛋白小食',
    macros: { kcal: 280, protein: 22, carbs: 28, fat: 8, fiber: 3 },
    category: '小食',
  },
  {
    name: '豬扒飯',
    hint: '茶記 · 一份',
    macros: { kcal: 720, protein: 36, carbs: 82, fat: 26, fiber: 2 },
    category: '茶記',
  },
  {
    name: '咖喱牛腩飯',
    hint: '茶記 · 濃味',
    macros: { kcal: 780, protein: 34, carbs: 88, fat: 30, fiber: 4 },
    category: '茶記',
  },
  {
    name: '水煮魚片飯',
    hint: '清淡啲 · 睇醬汁',
    macros: { kcal: 560, protein: 38, carbs: 70, fat: 12, fiber: 2 },
    category: '茶記',
  },
  {
    name: '麥皮雞蛋',
    hint: '早餐 · 加蛋白更好',
    macros: { kcal: 320, protein: 18, carbs: 36, fat: 10, fiber: 4 },
    category: '早餐',
  },
  {
    name: '壽司拼盤',
    hint: '約 8–10 件粗估',
    macros: { kcal: 480, protein: 24, carbs: 68, fat: 10, fiber: 2 },
    category: '茶記',
  },
  {
    name: '雞翼便當',
    hint: '外賣 · 皮油偏高',
    macros: { kcal: 650, protein: 32, carbs: 55, fat: 32, fiber: 3 },
    category: '茶記',
  },
  {
    name: '沙律雞胸',
    hint: '低脂 · 醬汁另計',
    macros: { kcal: 340, protein: 42, carbs: 18, fat: 10, fiber: 5 },
    category: 'gym撚常食',
  },
  {
    name: '牛肉麵',
    hint: '一碗 · 湯底睇油',
    macros: { kcal: 580, protein: 30, carbs: 70, fat: 16, fiber: 3 },
    category: '茶記',
  },
  // —— 會所／健身房食堂蛋白餐模板 ——
  {
    name: '會所雞胸糙米飯',
    hint: '會所食堂 · 高蛋白主餐',
    macros: { kcal: 480, protein: 52, carbs: 48, fat: 10, fiber: 6 },
    category: 'gym撚常食',
  },
  {
    name: '會所牛肉沙律碗',
    hint: '會所 · 少飯高蛋白',
    macros: { kcal: 420, protein: 46, carbs: 22, fat: 16, fiber: 7 },
    category: 'gym撚常食',
  },
  {
    name: '會所三文魚飯',
    hint: '會所 · Omega-3＋蛋白',
    macros: { kcal: 560, protein: 42, carbs: 52, fat: 18, fiber: 4 },
    category: 'gym撚常食',
  },
  {
    name: '會所雞蛋清蛋白碗',
    hint: '會所自助 · 蛋白為主',
    macros: { kcal: 310, protein: 40, carbs: 18, fat: 8, fiber: 3 },
    category: 'gym撚常食',
  },
  {
    name: '健身室蛋白棒',
    hint: '訓練前後 · 一條',
    macros: { kcal: 210, protein: 20, carbs: 22, fat: 7, fiber: 3 },
    category: '小食',
  },
  {
    name: '會所水煮蛋×3',
    hint: '自助加餐 · 三隻',
    macros: { kcal: 210, protein: 18, carbs: 2, fat: 14, fiber: 0 },
    category: '小食',
  },
  {
    name: '低脂芝士雞胸卷',
    hint: '會所／餐牌常見',
    macros: { kcal: 390, protein: 44, carbs: 28, fat: 10, fiber: 3 },
    category: 'gym撚常食',
  },
  {
    name: '會所豆腐魚柳飯',
    hint: '會所 · 清淡高蛋白',
    macros: { kcal: 450, protein: 40, carbs: 50, fat: 10, fiber: 5 },
    category: 'gym撚常食',
  },
  {
    name: '訓練後乳清＋蕉',
    hint: '一勺乳清 + 香蕉',
    macros: { kcal: 280, protein: 26, carbs: 32, fat: 4, fiber: 3 },
    category: '小食',
  },
  {
    name: '會所蝦仁蛋白炒飯',
    hint: '會所 · 蛋白飯',
    macros: { kcal: 520, protein: 38, carbs: 58, fat: 14, fiber: 3 },
    category: 'gym撚常食',
  },

  // —— 更多港式街坊 ——
  {
    name: '乾炒牛河',
    hint: '茶記 · 一份',
    macros: { kcal: 780, protein: 32, carbs: 88, fat: 32, fiber: 3 },
    category: '茶記',
  },
  {
    name: '炒蛋叉燒飯',
    hint: '茶記經典',
    macros: { kcal: 750, protein: 34, carbs: 80, fat: 28, fiber: 2 },
    category: '茶記',
  },
  {
    name: '海南雞飯',
    hint: '油飯偏多 · 粗估',
    macros: { kcal: 700, protein: 36, carbs: 75, fat: 26, fiber: 2 },
    category: '茶記',
  },
  {
    name: '豉油雞腿飯',
    hint: '茶記 · 連汁',
    macros: { kcal: 690, protein: 38, carbs: 72, fat: 24, fiber: 2 },
    category: '茶記',
  },
  {
    name: '通粉餐（火腿蛋）',
    hint: '茶記早餐／晏',
    macros: { kcal: 520, protein: 22, carbs: 58, fat: 20, fiber: 2 },
    category: '早餐',
  },
  {
    name: '公仔麵加蛋',
    hint: '一包 · 加隻蛋',
    macros: { kcal: 480, protein: 16, carbs: 62, fat: 18, fiber: 2 },
    category: '茶記',
  },
  {
    name: '腸粉（蝦米／叉燒）',
    hint: '兩條粗估',
    macros: { kcal: 360, protein: 14, carbs: 52, fat: 10, fiber: 1 },
    category: '早餐',
  },
  {
    name: '粥＋油條',
    hint: '皮蛋瘦肉粥連油條',
    macros: { kcal: 420, protein: 18, carbs: 55, fat: 14, fiber: 1 },
    category: '早餐',
  },
  {
    name: '車仔麵兩餸',
    hint: '街坊 · 兩餸一湯底',
    macros: { kcal: 550, protein: 28, carbs: 60, fat: 20, fiber: 3 },
    category: '茶記',
  },
  {
    name: '菠蘿油＋奶茶',
    hint: '茶記甜品套',
    macros: { kcal: 520, protein: 10, carbs: 68, fat: 22, fiber: 2 },
    category: '小食',
  },
  {
    name: '雞扒意粉',
    hint: '茶記西餐',
    macros: { kcal: 680, protein: 36, carbs: 78, fat: 22, fiber: 3 },
    category: '茶記',
  },
  {
    name: '吞拿魚沙律',
    hint: '便利店／咖啡店',
    macros: { kcal: 320, protein: 28, carbs: 18, fat: 14, fiber: 4 },
    category: '小食',
  },
  // —— 補劑／乳清快加 ——
  {
    name: '乳清一勺（水沖）',
    hint: '約 25–30g 粉 · 水沖',
    macros: { kcal: 120, protein: 24, carbs: 3, fat: 1, fiber: 0 },
    category: '補劑',
  },
  {
    name: '乳清一勺（奶沖）',
    hint: '一勺 + 250ml 低脂奶',
    macros: { kcal: 240, protein: 32, carbs: 15, fat: 5, fiber: 0 },
    category: '補劑',
  },
  {
    name: '乳清＋燕麥',
    hint: '訓練後 · 一勺+40g燕麥',
    macros: { kcal: 280, protein: 28, carbs: 32, fat: 4, fiber: 4 },
    category: '補劑',
  },
  {
    name: '酪蛋白睡前奶昔',
    hint: '慢蛋白 · 一勺',
    macros: { kcal: 130, protein: 24, carbs: 4, fat: 2, fiber: 0 },
    category: '補劑',
  },
  {
    name: '肌酸 5g',
    hint: '一茶匙 · 熱量可忽略',
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    category: '補劑',
  },
  {
    name: 'BCAA／EAA 一 scoop',
    hint: '訓練中 · 粗估',
    macros: { kcal: 20, protein: 5, carbs: 0, fat: 0, fiber: 0 },
    category: '補劑',
  },
  {
    name: '高蛋白乳酪杯',
    hint: '便利店常見 · 一杯',
    macros: { kcal: 160, protein: 20, carbs: 12, fat: 2, fiber: 0 },
    category: '補劑',
  },
  {
    name: '即食雞胸包',
    hint: '便利店／會所 · 一包',
    macros: { kcal: 150, protein: 28, carbs: 2, fat: 3, fiber: 0 },
    category: '補劑',
  },
]


export function dishesByCategory(cat?: DishCategory | '全部') {
  if (!cat || cat === '全部') return HK_DISH_ESTIMATES
  return HK_DISH_ESTIMATES.filter((d) => d.category === cat)
}

export function clubProteinDishes() {
  return HK_DISH_ESTIMATES.filter((d) => d.category === 'gym撚常食')
}

export function supplementDishes() {
  return HK_DISH_ESTIMATES.filter((d) => d.category === '補劑')
}

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
