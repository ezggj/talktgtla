import type { Place } from './places'

const KEY = 'tonight:contrib'

export interface Contrib {
  price?: string | null
  hours?: string | null
  rating?: number | null
  photo?: string | null
}

function clean(value: unknown): Contrib | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Contrib
  const rating = raw.rating == null ? null : Number(raw.rating)
  return {
    price: typeof raw.price === 'string' ? raw.price : null,
    hours: typeof raw.hours === 'string' ? raw.hours : null,
    rating: rating != null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
    photo: typeof raw.photo === 'string' && raw.photo.startsWith('data:image/') ? raw.photo : null,
  }
}

export function readContribs(): Record<string, Contrib> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    if (!raw || typeof raw !== 'object') return {}
    const entries = Object.entries(raw as Record<string, unknown>).flatMap(([id, value]) => {
      const contrib = clean(value)
      return contrib ? [[id, contrib] as const] : []
    })
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

export function writeContrib(id: string, patch: Contrib): Contrib {
  const all = readContribs()
  const next = clean({ ...all[id], ...patch }) ?? {}
  all[id] = next
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(all))
  return next
}

/** User fields replace OSM fields only when this device actually stored them. */
export function mergePlace(place: Place, contrib: Contrib | undefined): Place {
  if (!contrib) return place
  return {
    ...place,
    image: contrib.photo || place.image,
    imageCredit: contrib.photo ? '你補充 · 只係呢部機' : place.imageCredit,
    hours: contrib.hours?.trim() ? contrib.hours.trim() : place.hours,
    price: contrib.price?.trim() ? contrib.price.trim() : place.price,
  }
}
