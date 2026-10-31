/** Curated HK gym comparison data — 大約／參考，唔當報價。唔爬 live 價錢。 */

export type GymPriceBand = 'budget' | 'mid' | 'premium'

export type GymRegion = '港島' | '九龍' | '新界' | '多區'

export type HkGym = {
  id: string
  name: string
  nameZh: string
  /** 大致覆蓋地區（簡寫）——要夠齊，地區搜尋先揀得到 */
  areas: string[]
  regions: GymRegion[]
  priceBand: GymPriceBand
  /** 大約月費 HKD 區間（參考） */
  monthlyHkd: { min: number; max: number }
  is24h: boolean
  /** 器材重點 */
  equipment: string
  /** 氣氛／適合邊類人 */
  vibe: string
  /** 公開官網或介紹頁（可選） */
  link?: string
  tags: string[]
  /** 旗艦／值得置頂 */
  featured?: boolean
  /** 分店規模提示，例如「全港最多分店」 */
  branchNote?: string
  /** 搜尋別名（24/7、247fitness 等） */
  aliases?: string[]
}

export const PRICE_BAND_LABEL: Record<GymPriceBand, string> = {
  budget: '平價',
  mid: '中價',
  premium: '高端',
}

export const PRICE_BAND_HINT: Record<GymPriceBand, string> = {
  budget: '約 $200–450／月',
  mid: '約 $450–900／月',
  premium: '約 $900+／月',
}

export const REGION_OPTIONS: GymRegion[] = ['港島', '九龍', '新界', '多區']

export const EQUIPMENT_FOCUS = [
  { id: 'strength', label: '重訓／自由重量' },
  { id: 'machines', label: '器械齊' },
  { id: 'cardio', label: '有氧多' },
  { id: 'classes', label: '團課／瑜伽' },
  { id: 'public', label: '公眾／康文' },
] as const

export type EquipmentFocusId = (typeof EQUIPMENT_FOCUS)[number]['id']

/** Static curated list — update manually; mark prices as 參考. Featured first. */
export const HK_GYMS: HkGym[] = [
  {
    id: '247-fitness',
    name: '24/7 Fitness',
    nameZh: '247 Fitness',
    areas: [
      // 港島（含小西灣旗艦一帶）
      '小西灣',
      '柴灣',
      '筲箕灣',
      '西灣河',
      '鰂魚涌',
      '北角',
      '炮台山',
      '天后',
      '銅鑼灣',
      '灣仔',
      '中環',
      '上環',
      '西營盤',
      '西環',
      '堅尼地城',
      '薄扶林',
      '香港仔',
      '鴨脷洲',
      '黃竹坑',
      // 九龍
      '觀塘',
      '九龍灣',
      '旺角',
      '太子',
      '尖沙咀',
      '紅磡',
      '長沙灣',
      '深水埗',
      '黃大仙',
      '鑽石山',
      '油麻地',
      // 新界
      '荃灣',
      '葵涌',
      '屯門',
      '元朗',
      '天水圍',
      '沙田',
      '大圍',
      '大埔',
      '粉嶺',
      '上水',
      '將軍澳',
      '馬鞍山',
      '東涌',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'budget',
    monthlyHkd: { min: 200, max: 450 },
    is24h: true,
    equipment: '基本重訓＋有氧；分店有大有細，自由重量視舖而定——街坊型為主',
    vibe: '全港分店最多（百幾間級）、平、廿四小時；適合預算緊、住邊都想有舖、想半夜練',
    link: 'https://www.247fitness.hk/',
    tags: ['strength', 'machines', 'cardio'],
    featured: true,
    branchNote: '全港最多分店 · 港九新界遍佈（含小西灣藍灣廣場）',
    aliases: ['247', '24/7', '247fitness', '二十四七', '廿四七', 'siu sai wan'],
  },
  {
    id: 'efx24',
    name: 'EFX24',
    nameZh: 'EFX24',
    areas: [
      '小西灣',
      '灣仔',
      '香港仔',
      '九龍灣',
      '觀塘',
      '長沙灣',
      '大角咀',
      '新蒲崗',
      '沙田',
      '大圍',
      '石門',
      '荃灣',
      '元朗',
      '屯門',
      '馬鞍山',
      '粉嶺',
      '將軍澳',
      '西沙',
      '烏溪沙',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 500, max: 1000 },
    is24h: true,
    equipment: 'Gym80／Hammer Strength 等重訓齊、有氧多；多間 HYROX 官方訓練館',
    vibe: '商場旗艦 24 小時、場靚器材新；適合想喺港鐵商場練、玩功能性／HYROX',
    link: 'https://efx24.com/',
    tags: ['strength', 'machines', 'cardio'],
    featured: true,
    branchNote: '廿幾間直營 · 多入駐大型商場（沙田新城市、德福等）',
    aliases: ['efx', 'efx24', 'efx fitness', 'efx24 fitness'],
  },
  {
    id: 'anytime',
    name: 'Anytime Fitness',
    nameZh: 'Anytime Fitness',
    areas: ['中環', '銅鑼灣', '旺角', '尖沙咀', '沙田', '將軍澳', '荃灣', '大埔', '多區'],
    regions: ['多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 500, max: 780 },
    is24h: true,
    equipment: '器械為主、自由重量齊中；全球／全港分店互通（視會籍）',
    vibe: '連鎖穩陣、廿四小時；偏工作室大小，唔係巨型健身房',
    link: 'https://www.anytimefitness.com.hk/',
    tags: ['strength', 'machines', 'cardio'],
    aliases: ['anytime', 'atf'],
  },
  {
    id: 'pure',
    name: 'Pure Fitness',
    nameZh: 'Pure Fitness',
    areas: ['中環', '銅鑼灣', '太古', '尖沙咀', '九龍塘'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 1100, max: 2000 },
    is24h: false,
    equipment: '器械同自由重量齊全、泳池／桑拿視會所；團課同瑜伽強',
    vibe: '高端會所感；適合想齊設施、氣氛靚，預算夠',
    link: 'https://www.pure-international.com/',
    tags: ['strength', 'machines', 'cardio', 'classes'],
  },
  {
    id: 'go-gym',
    name: 'Go Gym',
    nameZh: 'Go Gym',
    areas: ['觀塘', '旺角', '葵涌', '屯門', '元朗'],
    regions: ['九龍', '新界'],
    priceBand: 'budget',
    monthlyHkd: { min: 250, max: 420 },
    is24h: false,
    equipment: '重訓器械為主、有氧機；分店面積中等',
    vibe: '性價比、年輕；適合想平少少又唔使廿四小時',
    link: 'https://www.gogym.hk/',
    tags: ['strength', 'machines', 'cardio'],
  },
  {
    id: 'snap',
    name: 'Snap Fitness',
    nameZh: 'Snap Fitness',
    areas: ['灣仔', '北角', '旺角', '九龍灣', '荃灣'],
    regions: ['港島', '九龍', '新界'],
    priceBand: 'mid',
    monthlyHkd: { min: 450, max: 700 },
    is24h: true,
    equipment: '自由重量＋器械平衡；偏 compact club',
    vibe: '廿四小時、唔使太大場；適合住／工附近有舖',
    link: 'https://www.snapfitness.com/',
    tags: ['strength', 'machines'],
  },
  {
    id: 'fitness-first',
    name: 'Fitness First',
    nameZh: 'Fitness First',
    areas: ['中環', '銅鑼灣', '尖沙咀'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 900, max: 1600 },
    is24h: false,
    equipment: '器械齊、團課多；部分會所有泳池／蒸氣',
    vibe: '傳統商業健身房；分店近年有收，簽約前要睇現有舖',
    link: 'https://www.fitnessfirst.com.hk/',
    tags: ['machines', 'cardio', 'classes'],
  },
  {
    id: 'lcsd',
    name: 'LCSD Sports Centres',
    nameZh: '康文署體育館',
    areas: ['全港各區體育館／運動場'],
    regions: ['多區'],
    priceBand: 'budget',
    monthlyHkd: { min: 50, max: 200 },
    is24h: false,
    equipment: '健身室器械視場地；另有羽毛球場、泳池等（分開租）',
    vibe: '最平、公眾；旺時要排隊，適合想慳錢試水',
    link: 'https://www.lcsd.gov.hk/',
    tags: ['public', 'machines', 'cardio'],
  },
  {
    id: 'physical',
    name: 'Physical Fitness',
    nameZh: 'Physical',
    areas: ['銅鑼灣', '旺角', '尖沙咀', '沙田'],
    regions: ['港島', '九龍', '新界'],
    priceBand: 'mid',
    monthlyHkd: { min: 480, max: 850 },
    is24h: false,
    equipment: '器械＋有氧為主；部分有團課',
    vibe: '中價連鎖；分店情況要現場確認',
    tags: ['machines', 'cardio', 'classes'],
  },
  {
    id: 'warriors',
    name: 'Warriors Gym',
    nameZh: 'Warriors Gym',
    areas: ['觀塘', '九龍灣一帶（本地工作室）'],
    regions: ['九龍'],
    priceBand: 'mid',
    monthlyHkd: { min: 600, max: 1200 },
    is24h: false,
    equipment: '重訓／力量舉、自由重量為主；空間視課室',
    vibe: '認真練鐵、教練氣氛；唔係大型連鎖',
    tags: ['strength'],
  },
  {
    id: 'clark-hatch',
    name: 'Clark Hatch',
    nameZh: 'Clark Hatch',
    areas: ['中環', '灣仔', '尖沙咀'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 1000, max: 1800 },
    is24h: false,
    equipment: '經典商業健身房器械；偏商務客',
    vibe: '老牌高端；適合中環／尖沙一帶上班',
    tags: ['machines', 'cardio', 'strength'],
  },
]

export type GymFilters = {
  region: GymRegion | '全部'
  priceBand: GymPriceBand | '全部'
  only24h: boolean
  equipment: EquipmentFocusId | '全部'
  query: string
}

export const DEFAULT_GYM_FILTERS: GymFilters = {
  region: '全部',
  priceBand: '全部',
  only24h: false,
  equipment: '全部',
  query: '',
}

export function formatMonthlyRange(g: HkGym): string {
  if (g.monthlyHkd.min === g.monthlyHkd.max) {
    return `約 $${g.monthlyHkd.min}`
  }
  return `約 $${g.monthlyHkd.min}–${g.monthlyHkd.max}`
}

/** 地區顯示：多區連鎖先標規模，再列代表分店 */
export function formatGymAreas(g: HkGym, maxShow = 6): string {
  const show = g.areas.slice(0, maxShow)
  const extra = g.areas.length - show.length
  const base = show.join(' · ')
  if (extra > 0) return `${base} · 等 ${g.areas.length} 區`
  return base
}

function gymSearchHay(g: HkGym): string {
  return [
    g.name,
    g.nameZh,
    g.areas.join(' '),
    g.equipment,
    g.vibe,
    g.branchNote ?? '',
    ...(g.aliases ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function sortGyms(list: HkGym[]): HkGym[] {
  return [...list].sort((a, b) => {
    const af = a.featured ? 0 : 1
    const bf = b.featured ? 0 : 1
    if (af !== bf) return af - bf
    // stable-ish: keep curated order among same featured tier
    return HK_GYMS.indexOf(a) - HK_GYMS.indexOf(b)
  })
}

export function filterGyms(filters: GymFilters, list: HkGym[] = HK_GYMS): HkGym[] {
  const q = filters.query.trim().toLowerCase()
  const filtered = list.filter((g) => {
    if (filters.only24h && !g.is24h) return false
    if (filters.priceBand !== '全部' && g.priceBand !== filters.priceBand) return false
    if (filters.region !== '全部') {
      if (filters.region === '多區') {
        // 多區：標咗「多區」、或覆蓋 ≥2 個大區（港島／九龍／新界）
        const big = g.regions.filter((r) => r === '港島' || r === '九龍' || r === '新界')
        if (!g.regions.includes('多區') && big.length < 2) return false
      } else if (!g.regions.includes(filters.region) && !g.regions.includes('多區')) {
        return false
      }
    }
    if (filters.equipment !== '全部' && !g.tags.includes(filters.equipment)) return false
    if (q && !gymSearchHay(g).includes(q)) return false
    return true
  })
  return sortGyms(filtered)
}

export function gymById(id: string): HkGym | undefined {
  return HK_GYMS.find((g) => g.id === id)
}

export function featuredGyms(list: HkGym[] = HK_GYMS): HkGym[] {
  return list.filter((g) => g.featured)
}
