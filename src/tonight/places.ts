import { distanceMeters } from './geo'
import { isOpenAt } from './hours'

export interface Area {
  id: string
  name: string
  lat: number
  lng: number
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
  { id: 'shatin', name: '沙田', lat: 22.381, lng: 114.188 },
  { id: 'tuenmun', name: '屯門', lat: 22.391, lng: 113.977 },
  { id: 'yuenlong', name: '元朗', lat: 22.445, lng: 114.022 },
  { id: 'tsuenwan', name: '荃灣', lat: 22.371, lng: 114.114 },
  { id: 'tkw', name: '將軍澳', lat: 22.318, lng: 114.26 },
]

export const HOT_AREAS = ['中環', '旺角', '銅鑼灣', '尖沙咀', '沙田'] as const
export const CUISINES = ['茶餐廳', '火鍋', '壽司', '拉麵', '燒味', '咖啡'] as const
export type CuisineChip = (typeof CUISINES)[number]

export interface Place {
  id: string
  name: string
  nameEn: string | null
  area: string | null
  kind: string
  cuisine: string | null
  price: string | null
  lat: number
  lng: number
  hours: string | null
  phone: string | null
  website: string | null
  address: string | null
  image: string | null
  imageCredit: string | null
}

export interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const KIND_LABEL: Record<string, string> = {
  restaurant: '餐廳',
  cafe: '咖啡店',
  fast_food: '快餐',
  food_court: '美食廣場',
  ice_cream: '雪糕',
  bar: '酒吧',
  pub: '酒吧',
  biergarten: '啤酒園',
  bakery: '麵包店',
  tea: '茶',
}

const CHIP_NEEDLES: Record<CuisineChip, string[]> = {
  茶餐廳: ['茶餐廳', '冰室', 'cha_chaan', 'cha chaan', 'hong_kong'],
  火鍋: ['火鍋', 'hotpot', 'hot_pot', 'shabu'],
  壽司: ['壽司', 'sushi'],
  拉麵: ['拉麵', '拉面', 'ramen'],
  燒味: ['燒味', '叉燒', 'siu_mei', 'siu mei', 'char_siu'],
  咖啡: ['咖啡', 'coffee', 'cafe'],
}

const CUISINE_LABEL: Record<string, string> = {
  chinese: '中菜',
  cantonese: '粵菜',
  hong_kong: '港式',
  hong_kong_style: '港式',
  noodle: '麵',
  noodles: '麵',
  coffee: '咖啡',
  coffee_shop: '咖啡',
  burger: '漢堡',
  hotpot: '火鍋',
  hot_pot: '火鍋',
  regional: '地方菜',
  beef_bowl: '牛肉飯',
  chicken: '雞',
  pizza: '薄餅',
  japanese: '日本菜',
  sushi: '壽司',
  ramen: '拉麵',
  thai: '泰國菜',
  indian: '印度菜',
  korean: '韓國菜',
  vietnamese: '越南菜',
  italian: '意大利菜',
  french: '法國菜',
  tea: '茶',
  bakery: '麵包',
  dessert: '甜品',
  ice_cream: '雪糕',
  seafood: '海鮮',
  bbq: '燒烤',
  asian: '亞洲菜',
  international: '多國菜',
  local: '本地',
}

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind
}

export function cuisineLabel(raw: string | null): string | null {
  if (!raw) return null
  const labels = raw.split(/[;,]/).flatMap((part) => {
    const token = part.trim()
    if (!token) return []
    if (/[\u4e00-\u9fff]/.test(token)) return [token]
    return CUISINE_LABEL[token.toLowerCase()] ? [CUISINE_LABEL[token.toLowerCase()]] : []
  })
  return labels.length ? [...new Set(labels)].join('、') : null
}

export function matchesChip(place: Place, chip: string): boolean {
  const needles = CHIP_NEEDLES[chip as CuisineChip]
  if (!needles) return false
  const hay = `${place.name} ${place.nameEn ?? ''} ${place.cuisine ?? ''} ${place.kind}`.toLowerCase()
  return needles.some((needle) => hay.includes(needle.toLowerCase()))
}

function pickName(tags: Record<string, string>): { name: string; nameEn: string | null } | null {
  const zh = tags['name:zh-Hant'] || tags['name:zh'] || tags['name:zh-HK'] || ''
  const en = tags['name:en'] || ''
  const plain = tags.name || ''
  const name = zh || plain || en
  if (!name) return null
  const nameEn = en && en !== name ? en : !zh && plain && en ? null : zh && plain && plain !== zh ? plain : en && en !== name ? en : null
  return { name, nameEn: nameEn || null }
}

function addressOf(tags: Record<string, string>): string | null {
  if (tags['addr:full']) return tags['addr:full']
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:district']].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

function areaOf(tags: Record<string, string>, lat: number, lng: number): string | null {
  const tagged = `${tags['addr:suburb'] || ''} ${tags['addr:district'] || ''} ${tags['addr:city'] || ''}`
  const named = AREAS.find((area) => tagged.includes(area.name))
  if (named) return named.name
  let best: { name: string; km: number } | null = null
  for (const area of AREAS) {
    const km = Math.hypot((lat - area.lat) * 111, (lng - area.lng) * 96)
    if (!best || km < best.km) best = { name: area.name, km }
  }
  return best && best.km < 2.2 ? best.name : null
}

function imageOf(tags: Record<string, string>): { image: string; credit: string } | null {
  const direct = tags.image || tags['image:url'] || ''
  if (direct.startsWith('https://upload.wikimedia.org/')) return { image: direct, credit: 'Wikimedia Commons' }
  const file = tags.wikimedia_commons || ''
  if (file.startsWith('File:')) {
    const name = encodeURIComponent(file.slice(5).replace(/ /g, '_'))
    return { image: `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=960`, credit: 'Wikimedia Commons' }
  }
  return null
}

export function parseElement(element: OverpassElement): Place | null {
  const tags = element.tags
  if (!tags) return null
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat == null || lng == null) return null
  const names = pickName(tags)
  if (!names) return null
  const kind = tags.amenity || tags.shop || 'place'
  const photo = imageOf(tags)
  return {
    id: `${element.type}-${element.id}`,
    name: names.name,
    nameEn: names.nameEn,
    area: areaOf(tags, lat, lng),
    kind,
    cuisine: tags.cuisine || null,
    price: tags.price_range || tags['diet:price'] || null,
    lat,
    lng,
    hours: tags.opening_hours || null,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    address: addressOf(tags),
    image: photo?.image ?? null,
    imageCredit: photo?.credit ?? null,
  }
}

export type PlaceSort = 'near' | 'hot' | 'photo' | 'rated'

/**
 * 熱門 is not a crowd or Google rank.
 * It scores how complete the public tags are: photo 3, hours 2, phone 2,
 * website 1, cuisine 1, price 1, address 1, district 1.
 */
export function hotScore(place: Place): number {
  let score = 0
  if (place.image) score += 3
  if (place.hours) score += 2
  if (place.phone) score += 2
  if (place.website) score += 1
  if (place.cuisine) score += 1
  if (place.price) score += 1
  if (place.address) score += 1
  if (place.area) score += 1
  return score
}

export function filterPlaces(
  places: readonly Place[],
  input: {
    query?: string
    area?: string
    cuisine?: string
    bbox?: [number, number, number, number]
    near?: { lat: number; lng: number; radiusM: number }
    openNow?: boolean
    now?: Date
    hideIncomplete?: boolean
    sort?: PlaceSort
    ratedIds?: ReadonlySet<string>
    limit?: number
  },
): Place[] {
  const query = input.query?.trim().toLowerCase() ?? ''
  const now = input.now ?? new Date()
  const [south, west, north, east] = input.bbox ?? []
  const found: Place[] = []
  for (const place of places) {
    if (input.hideIncomplete && !input.near && !place.area) continue
    if (input.area && place.area !== input.area) continue
    if (input.cuisine && !matchesChip(place, input.cuisine)) continue
    if (south != null && (place.lat < south || place.lat > north! || place.lng < west! || place.lng > east!)) continue
    if (input.near && distanceMeters(input.near.lat, input.near.lng, place.lat, place.lng) > input.near.radiusM) continue
    if (query) {
      const hay = `${place.name} ${place.nameEn ?? ''} ${place.cuisine ?? ''} ${place.area ?? ''} ${kindLabel(place.kind)}`.toLowerCase()
      if (!hay.includes(query)) continue
    }
    if (input.openNow && isOpenAt(place.hours, now) !== true) continue
    if (input.sort === 'photo' && !place.image) continue
    if (input.sort === 'rated' && !input.ratedIds?.has(place.id)) continue
    found.push(place)
  }
  if (input.sort === 'near' && input.near) {
    const { lat, lng } = input.near
    found.sort((a, b) => distanceMeters(lat, lng, a.lat, a.lng) - distanceMeters(lat, lng, b.lat, b.lng))
  } else if (input.sort === 'hot' || input.sort === 'photo') {
    found.sort((a, b) => hotScore(b) - hotScore(a) || a.name.localeCompare(b.name, 'zh-HK'))
  }
  return input.limit ? found.slice(0, input.limit) : found
}
