export type Cuisine = '茶餐廳' | '火鍋' | '壽司' | '拉麵' | '燒味' | '咖啡'

export interface Area {
  id: string
  name: string
  lat: number
  lng: number
}

export interface Shop {
  id: string
  name: string
  nameEn: string
  area: string
  cuisine: Cuisine
  price: '$' | '$$' | '$$$'
  lat: number
  lng: number
  hours: string
  mtr: string
  badge: '街坊推介' | '排隊名店' | '今晚有位' | '夜消夜'
  dishes: string[]
  blurb: string
  tone: 'tea' | 'pot' | 'fish' | 'noodle' | 'roast' | 'cup'
}

export const AREAS: readonly Area[] = [
  { id: 'central', name: '中環', lat: 22.2819, lng: 114.158 },
  { id: 'sheungwan', name: '上環', lat: 22.2866, lng: 114.1496 },
  { id: 'wanchai', name: '灣仔', lat: 22.277, lng: 114.1729 },
  { id: 'causeway', name: '銅鑼灣', lat: 22.2804, lng: 114.1848 },
  { id: 'northpoint', name: '北角', lat: 22.2914, lng: 114.2001 },
  { id: 'mongkok', name: '旺角', lat: 22.3193, lng: 114.1694 },
  { id: 'prince', name: '太子', lat: 22.3247, lng: 114.1683 },
  { id: 'shamshui', name: '深水埗', lat: 22.3308, lng: 114.1622 },
  { id: 'jordan', name: '佐敦', lat: 22.3048, lng: 114.1716 },
  { id: 'tsim', name: '尖沙咀', lat: 22.2976, lng: 114.1722 },
]

export const CUISINES: readonly Cuisine[] = ['茶餐廳', '火鍋', '壽司', '拉麵', '燒味', '咖啡']

/** Original demo shops. Names, dishes and hours are invented, not real businesses. */
export const SHOPS: readonly Shop[] = [
  {
    id: 'night-lamp',
    name: '夜燈冰室',
    nameEn: 'Night Lamp Cafe',
    area: '銅鑼灣',
    cuisine: '茶餐廳',
    price: '$',
    lat: 22.2809,
    lng: 114.1836,
    hours: '07:00–23:30',
    mtr: '銅鑼灣站 D 出，行四分鐘',
    badge: '街坊推介',
    dishes: ['絲襪奶茶', '菠蘿油', '乾炒牛河'],
    blurb: '霓虹底下飲奶茶，窗邊位最搶手。',
    tone: 'tea',
  },
  {
    id: 'side-pot',
    name: '橫街鍋氣',
    nameEn: 'Side Street Pot',
    area: '旺角',
    cuisine: '火鍋',
    price: '$$',
    lat: 22.3184,
    lng: 114.1706,
    hours: '17:00–01:00',
    mtr: '旺角站 E2 出，行六分鐘',
    badge: '排隊名店',
    dishes: ['手打蝦滑', '清湯鍋底', '脆豆腐'],
    blurb: '橫街窄舖，湯底夠清，唔使行商場。',
    tone: 'pot',
  },
  {
    id: 'harbour-breeze',
    name: '海風握',
    nameEn: 'Harbour Breeze',
    area: '尖沙咀',
    cuisine: '壽司',
    price: '$$$',
    lat: 22.2968,
    lng: 114.1738,
    hours: '12:00–22:00',
    mtr: '尖沙咀站 A1 出，向海行八分鐘',
    badge: '今晚有位',
    dishes: ['炙燒三文魚', '甜蝦', '玉子'],
    blurb: '細櫃檯，師傅握完即刻食。',
    tone: 'fish',
  },
  {
    id: 'late-bowl',
    name: '深夜湯麵',
    nameEn: 'Late Bowl',
    area: '深水埗',
    cuisine: '拉麵',
    price: '$$',
    lat: 22.3314,
    lng: 114.1614,
    hours: '18:00–02:00',
    mtr: '深水埗站 D2 出，行三分鐘',
    badge: '夜消夜',
    dishes: ['豚骨拉麵', '味玉', '炸雞'],
    blurb: '收工先至旺，湯頭鹹香，坐到半夜。',
    tone: 'noodle',
  },
  {
    id: 'roast-lane',
    name: '叉燒巷',
    nameEn: 'Roast Lane',
    area: '中環',
    cuisine: '燒味',
    price: '$$',
    lat: 22.2832,
    lng: 114.1554,
    hours: '11:00–21:00',
    mtr: '中環站 D2 出，行五分鐘',
    badge: '街坊推介',
    dishes: ['蜜汁叉燒', '燒肉', '例湯'],
    blurb: '巷仔舖頭，叉燒切到見火位。',
    tone: 'roast',
  },
  {
    id: 'window-seat',
    name: '窗邊咖啡',
    nameEn: 'Window Seat',
    area: '灣仔',
    cuisine: '咖啡',
    price: '$$',
    lat: 22.2764,
    lng: 114.1736,
    hours: '08:00–19:00',
    mtr: '灣仔站 A3 出，行四分鐘',
    badge: '今晚有位',
    dishes: ['奶咖', '巴斯克蛋糕', '蛋沙律多士'],
    blurb: '舊唐樓窗位，下午先至有陽光。',
    tone: 'cup',
  },
  {
    id: 'neon-booth',
    name: '霓虹冰室',
    nameEn: 'Neon Booth',
    area: '旺角',
    cuisine: '茶餐廳',
    price: '$',
    lat: 22.3206,
    lng: 114.1682,
    hours: '06:30–00:30',
    mtr: '太子站 B2 出，行五分鐘',
    badge: '夜消夜',
    dishes: ['凍奶茶', '西多', '茄汁撈丁'],
    blurb: '招牌夠耀，宵夜檔最熱鬧。',
    tone: 'tea',
  },
  {
    id: 'wok-whisper',
    name: '鑊氣小館',
    nameEn: 'Wok Whisper',
    area: '深水埗',
    cuisine: '燒味',
    price: '$',
    lat: 22.3296,
    lng: 114.1634,
    hours: '10:30–20:30',
    mtr: '深水埗站 B2 出，行七分鐘',
    badge: '街坊推介',
    dishes: ['油雞', '燒鴨脾', '白飯'],
    blurb: '鑊氣重，白飯要加倍。',
    tone: 'roast',
  },
  {
    id: 'paper-lantern',
    name: '紙燈拉麵',
    nameEn: 'Paper Lantern',
    area: '銅鑼灣',
    cuisine: '拉麵',
    price: '$$',
    lat: 22.2792,
    lng: 114.1856,
    hours: '12:00–22:30',
    mtr: '銅鑼灣站 F1 出，行三分鐘',
    badge: '排隊名店',
    dishes: ['醬油拉麵', '叉燒', '葱油'],
    blurb: '燈色暖，隊唔長就入到。',
    tone: 'noodle',
  },
  {
    id: 'harbour-ember',
    name: '維港小火',
    nameEn: 'Harbour Ember',
    area: '中環',
    cuisine: '火鍋',
    price: '$$$',
    lat: 22.2826,
    lng: 114.1594,
    hours: '17:30–23:00',
    mtr: '香港站 E 出，行六分鐘',
    badge: '今晚有位',
    dishes: ['番茄鍋', '肥牛', '手工麵'],
    blurb: '細火鍋，兩個人剛剛好。',
    tone: 'pot',
  },
  {
    id: 'three-tide',
    name: '三色壽司',
    nameEn: 'Three Tide',
    area: '灣仔',
    cuisine: '壽司',
    price: '$$',
    lat: 22.2782,
    lng: 114.1748,
    hours: '12:00–21:30',
    mtr: '灣仔站 A4 出，行五分鐘',
    badge: '街坊推介',
    dishes: ['吞拿魚', '八爪魚', '黄瓜卷'],
    blurb: '午市定食夠快，收工都趕得切。',
    tone: 'fish',
  },
  {
    id: 'sugar-lane',
    name: '糖街咖啡',
    nameEn: 'Sugar Lane',
    area: '太子',
    cuisine: '咖啡',
    price: '$',
    lat: 22.3254,
    lng: 114.1672,
    hours: '09:00–20:00',
    mtr: '太子站 B1 出，行兩分鐘',
    badge: '街坊推介',
    dishes: ['髒髒咖啡', '菠蘿包', '梳乎厘'],
    blurb: '街角細枱，帶本書都坐得耐。',
    tone: 'cup',
  },
  {
    id: 'pier-roast',
    name: '碼頭燒味',
    nameEn: 'Pier Roast',
    area: '佐敦',
    cuisine: '燒味',
    price: '$$',
    lat: 22.3056,
    lng: 114.1702,
    hours: '11:00–21:30',
    mtr: '佐敦站 C 出，行六分鐘',
    badge: '排隊名店',
    dishes: ['脆皮燒肉', '叉燒飯', '例湯'],
    blurb: '皮脆，飯香，收舖前最好味。',
    tone: 'roast',
  },
  {
    id: 'north-booth',
    name: '北角冰室',
    nameEn: 'North Booth',
    area: '北角',
    cuisine: '茶餐廳',
    price: '$',
    lat: 22.291,
    lng: 114.1992,
    hours: '07:00–22:00',
    mtr: '北角站 A 出，行三分鐘',
    badge: '街坊推介',
    dishes: ['熱奶茶', '公仔麵', '煎蛋多士'],
    blurb: '朝早最旺，阿叔阿嬸坐滿一櫃。',
    tone: 'tea',
  },
]

export function shopById(id: string): Shop | undefined {
  return SHOPS.find((shop) => shop.id === id)
}

export function filterShops(input: { query?: string; area?: string; cuisine?: string }): Shop[] {
  const query = input.query?.trim().toLowerCase() ?? ''
  return SHOPS.filter((shop) => {
    if (input.area && shop.area !== input.area) return false
    if (input.cuisine && shop.cuisine !== input.cuisine) return false
    if (!query) return true
    const haystack = `${shop.name} ${shop.nameEn} ${shop.area} ${shop.cuisine} ${shop.dishes.join(' ')}`.toLowerCase()
    return haystack.includes(query)
  })
}

export function todaysPicks(): Shop[] {
  return SHOPS.filter((shop) => shop.badge === '街坊推介' || shop.badge === '排隊名店').slice(0, 6)
}
