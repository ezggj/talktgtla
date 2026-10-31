/** Curated HK gym comparison data — 大約／參考，唔當報價。唔爬 live 價錢。
 *  對齊公開資料（2025–2026）：消委會表、247.fitness、efx24.com、go24fitness.com、康文署等。
 */

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
  /** 大約月費 HKD 區間（參考；通常 12 個月會籍低端 → 短約／單月高端） */
  monthlyHkd: { min: number; max: number }
  /** 顯示用價錢說明（優先於純區間），例如「12個月約 $550」 */
  priceNote?: string
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
  budget: '約 $180–450／月',
  mid: '約 $500–1,050／月',
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
      // 港島
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
      '金鐘',
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
      '美孚',
      // 新界／離島
      '荃灣',
      '葵涌',
      '葵芳',
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
      '長洲',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 550, max: 1050 },
    priceNote: '12個月約 $550；單月可至 $1,050',
    is24h: true,
    equipment: '基本重訓＋有氧；分店有大有細，自由重量視舖而定——街坊型為主',
    vibe: '全港分店最多（140+）、明碼按月扣、廿四小時；適合住邊都想有舖、預算簽一年約',
    link: 'https://247.fitness/',
    tags: ['strength', 'machines', 'cardio'],
    featured: true,
    branchNote: '全港最多分店 · 140+（港九新界／離島；一個會籍全線＋部分海外）',
    aliases: ['247', '24/7', '247fitness', '二十四七', '廿四七', 'siu sai wan'],
  },
  {
    id: 'efx24',
    name: 'EFX24',
    nameZh: 'EFX24',
    areas: [
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
      '屯門',
      '馬鞍山',
      '粉嶺',
      '將軍澳',
      '烏溪沙',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 538, max: 998 },
    priceNote: '12個月約 $538；單月約 $998',
    is24h: true,
    equipment: 'Hammer Strength／Gym80 等重訓齊、有氧多；多間 HYROX 官方訓練館',
    vibe: '場靚器材新、一個會籍全線；偏九龍／新界商場，港島舖相對少',
    link: 'https://efx24.com/',
    tags: ['strength', 'machines', 'cardio'],
    featured: true,
    branchNote: '約 15–20 間直營 · 多入駐大型商場（德福、新城市等）',
    aliases: ['efx', 'efx24', 'efx fitness', 'efx24 fitness'],
  },
  {
    id: 'anytime',
    name: 'Anytime Fitness',
    nameZh: 'Anytime Fitness',
    areas: [
      '中環',
      '銅鑼灣',
      '灣仔',
      '旺角',
      '尖沙咀',
      '沙田',
      '將軍澳',
      '荃灣',
      '大埔',
      '元朗',
      '屯門',
      '多區',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 550, max: 850 },
    priceNote: '12個月約 $550；單月約 $850（另電子鎖匙約 $500）',
    is24h: true,
    equipment: '器械為主、自由重量齊中；全球／全港分店互通（視會籍）',
    vibe: '連鎖穩陣、廿四小時、全球通行；偏工作室大小，唔係巨型健身房',
    link: 'https://www.anytimefitness.com.hk/',
    tags: ['strength', 'machines', 'cardio'],
    branchNote: '約 30–40 間本港分店 · 全球 Anytime 互通',
    aliases: ['anytime', 'atf'],
  },
  {
    id: 'go24',
    name: 'GO24 Fitness',
    nameZh: 'GO24 Fitness',
    areas: ['堅尼地城', '灣仔', '旺角', '觀塘', '九龍', '新界', '多區'],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 578, max: 678 },
    priceNote: '12個月約 $578；月費約 $678（另按金／行政費）',
    is24h: true,
    equipment: '自由重量＋有氧齊；另有 ONYX 精品線（更高價）',
    vibe: '本地 24 小時、可揀短約／日票；適合想靈活、唔只簽一年',
    link: 'https://www.go24fitness.com/',
    tags: ['strength', 'machines', 'cardio'],
    branchNote: '約 8–10 間 GO24（ONYX 另計）',
    aliases: ['go24', 'go 24', 'go gym', 'gogym', 'onyx'],
  },
  {
    id: 'snap',
    name: 'Snap Fitness',
    nameZh: 'Snap Fitness',
    areas: [
      '灣仔',
      '天后',
      '北角',
      '鰂魚涌',
      '西灣河',
      '薄扶林',
      '旺角',
      '太子',
      '何文田',
      '九龍灣',
      '觀塘',
      '長沙灣',
      '美孚',
      '新蒲崗',
      '荃灣',
      '葵涌',
      '沙田',
      '大埔',
    ],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'mid',
    monthlyHkd: { min: 530, max: 670 },
    priceNote: '約 $530–670／月（分店／合約不一；另門卡費）',
    is24h: true,
    equipment: '自由重量＋器械平衡；偏 compact club；部分有團課',
    vibe: '廿四小時、全球 Snap 通行；適合住／工附近有舖',
    link: 'https://www.snapfitness.com/hk_en',
    tags: ['strength', 'machines'],
    branchNote: '約 20–28 間本港分店',
    aliases: ['snap', 'snapfitness'],
  },
  {
    id: 'fit24',
    name: 'FIT24',
    nameZh: 'FIT24',
    areas: ['灣仔', '北角', '尖沙咀', '旺角', '將軍澳', '元朗', '粉嶺', '葵芳'],
    regions: ['港島', '九龍', '新界', '多區'],
    priceBand: 'budget',
    monthlyHkd: { min: 299, max: 450 },
    priceNote: '長約可低至約 $299；短約會貴啲',
    is24h: true,
    equipment: '基本重訓＋有氧；舖數少，先確認附近有冇',
    vibe: '24 小時平價線；適合預算緊又住近分店',
    tags: ['strength', 'machines', 'cardio'],
    branchNote: '約 8 間',
    aliases: ['fit24', 'fit 24'],
  },
  {
    id: 'pure',
    name: 'Pure Fitness',
    nameZh: 'Pure Fitness',
    areas: ['中環', '銅鑼灣', '太古', '灣仔', '尖沙咀', '九龍塘', '多區'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 1200, max: 2500 },
    priceNote: '約 $1,200–2,500（視單店／區域／全線）',
    is24h: false,
    equipment: '器械同自由重量齊全、泳池／桑拿視會所；團課同瑜伽強',
    vibe: '高端會所感；適合想齊設施、氣氛靚，預算夠',
    link: 'https://www.pure-international.com/',
    tags: ['strength', 'machines', 'cardio', 'classes'],
    branchNote: '十多間級 · 偏港島／核心商區',
    aliases: ['pure', 'pure fitness'],
  },
  {
    id: 'fitness-first',
    name: 'Fitness First',
    nameZh: 'Fitness First',
    areas: ['中環', '銅鑼灣', '尖沙咀'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 900, max: 1600 },
    priceNote: '約 $900–1,600（分店少，簽約前確認現有舖）',
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
    monthlyHkd: { min: 90, max: 180 },
    priceNote: '月票 $180（學生／長者等半價 $90）',
    is24h: false,
    equipment: '健身室器械視場地；另有羽毛球場、泳池等（分開租）',
    vibe: '最平、公眾；旺時要經 SmartPLAY 預訂，適合想慳錢試水',
    link: 'https://www.lcsd.gov.hk/tc/fitness/ticket.html',
    tags: ['public', 'machines', 'cardio'],
    branchNote: '全港多個體育館健身室',
    aliases: ['康文署', 'lcsd', 'smartplay', '體育館'],
  },
  {
    id: 'physical',
    name: 'Physical Fitness',
    nameZh: 'Physical',
    areas: ['銅鑼灣', '旺角', '尖沙咀', '沙田'],
    regions: ['港島', '九龍', '新界'],
    priceBand: 'mid',
    monthlyHkd: { min: 480, max: 850 },
    priceNote: '約 $480–850（分店／優惠差好大，現場確認）',
    is24h: false,
    equipment: '器械＋有氧為主；部分有團課',
    vibe: '中價連鎖；分店情況要現場確認',
    tags: ['machines', 'cardio', 'classes'],
    aliases: ['physical'],
  },
  {
    id: 'warriors',
    name: 'Warriors Gym',
    nameZh: 'Warriors Gym',
    areas: ['觀塘', '九龍灣一帶（本地工作室）'],
    regions: ['九龍'],
    priceBand: 'mid',
    monthlyHkd: { min: 600, max: 1200 },
    priceNote: '約 $600–1,200（工作室級，非大型連鎖報價）',
    is24h: false,
    equipment: '重訓／力量舉、自由重量為主；空間視課室',
    vibe: '認真練鐵、教練氣氛；唔係大型連鎖',
    tags: ['strength'],
    aliases: ['warriors'],
  },
  {
    id: 'clark-hatch',
    name: 'Clark Hatch',
    nameZh: 'Clark Hatch',
    areas: ['中環', '灣仔', '尖沙咀'],
    regions: ['港島', '九龍'],
    priceBand: 'premium',
    monthlyHkd: { min: 1000, max: 1800 },
    priceNote: '約 $1,000–1,800（商務會所級參考）',
    is24h: false,
    equipment: '經典商業健身房器械；偏商務客',
    vibe: '老牌高端；適合中環／尖沙一帶上班',
    tags: ['machines', 'cardio', 'strength'],
    aliases: ['clark hatch', 'clarkhatch'],
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
  if (g.priceNote) return g.priceNote
  if (g.monthlyHkd.min === g.monthlyHkd.max) {
    return `約 $${g.monthlyHkd.min.toLocaleString('en-HK')}`
  }
  return `約 $${g.monthlyHkd.min.toLocaleString('en-HK')}–${g.monthlyHkd.max.toLocaleString('en-HK')}`
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
    g.priceNote ?? '',
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
