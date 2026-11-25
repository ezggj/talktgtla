import { parseElement, type OverpassElement, type Place } from './places'
import seed from './osm-seed.json'

const TTL_MS = 6 * 60 * 60 * 1000
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const QUERY = `[out:json][timeout:90];(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|biergarten)$"](22.15,113.83,22.56,114.44);nwr["shop"~"^(bakery|tea)$"](22.15,113.83,22.56,114.44););out tags center;`

const RETRY_MS = 10 * 60 * 1000
let memory: { at: number; places: Place[]; source: 'overpass' | 'seed' } | null = null
let refreshing: Promise<Place[] | null> | null = null
let nextTry = 0

function fromSeed(): Place[] {
  return seed as Place[]
}

export function placesFromOverpass(body: { elements?: OverpassElement[] }): Place[] {
  const places: Place[] = []
  for (const element of body.elements ?? []) {
    const place = parseElement(element)
    if (place) places.push(place)
  }
  return places
}

async function pull(): Promise<Place[] | null> {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'talktgtla-tonight/1.0 (https://talktgtla.com)',
          accept: 'application/json',
        },
        body: `data=${encodeURIComponent(QUERY)}`,
        signal: AbortSignal.timeout(12_000),
        cache: 'no-store',
      })
      if (!response.ok) continue
      const body = (await response.json()) as { elements?: OverpassElement[] }
      const places = placesFromOverpass(body)
      if (places.length > 100) return places
    } catch {
      continue
    }
  }
  return null
}

function startRefresh(): Promise<Place[] | null> {
  if (refreshing) return refreshing
  refreshing = pull().finally(() => {
    refreshing = null
  })
  return refreshing
}

function remember(places: Place[], source: 'overpass' | 'seed') {
  memory = { at: Date.now(), places, source }
  nextTry = Date.now() + (source === 'overpass' ? TTL_MS : RETRY_MS)
}

export async function loadPlaces(): Promise<{ places: Place[]; stale: boolean; source: 'cache' | 'overpass' | 'seed' }> {
  const now = Date.now()
  if (memory && now < nextTry) {
    return { places: memory.places, stale: memory.source !== 'overpass', source: memory.source === 'overpass' ? 'cache' : 'seed' }
  }
  const pending = startRefresh()
  pending
    .then((fresh) => {
      if (fresh && fresh.length > 100) remember(fresh, 'overpass')
    })
    .catch(() => undefined)
  if (!memory) {
    const fresh = await Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))])
    if (fresh && fresh.length > 100) {
      remember(fresh, 'overpass')
      return { places: fresh, stale: false, source: 'overpass' }
    }
    remember(fromSeed(), 'seed')
  } else {
    nextTry = Date.now() + RETRY_MS
  }
  const current = memory
  if (!current) return { places: fromSeed(), stale: true, source: 'seed' }
  return { places: current.places, stale: current.source !== 'overpass', source: current.source }
}

export function readSeedCount(): number {
  return Array.isArray(seed) ? seed.length : 0
}
