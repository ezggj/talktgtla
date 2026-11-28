import { connection, NextResponse } from 'next/server'
import { filterPlaces, type Place, type PlaceSort } from '@/tonight/places'
import { loadPlaces } from '@/tonight/osm'

const SORTS = new Set<PlaceSort>(['near', 'hot', 'photo', 'rated'])

export async function GET(request: Request) {
  await connection()
  const url = new URL(request.url)
  const loaded = await loadPlaces()
  const bboxRaw = url.searchParams.get('bbox')
  const parts = bboxRaw?.split(',').map(Number) ?? []
  const bbox = parts.length === 4 && parts.every((value) => Number.isFinite(value)) ? (parts as [number, number, number, number]) : undefined
  const id = url.searchParams.get('id')
  const ids = url.searchParams.get('ids')
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const radius = Number(url.searchParams.get('radius'))
  const near = Number.isFinite(lat) && Number.isFinite(lng) && radius > 0 ? { lat, lng, radiusM: Math.min(radius, 5000) } : undefined
  const sortRaw = url.searchParams.get('sort')
  const sort = sortRaw && SORTS.has(sortRaw as PlaceSort) ? (sortRaw as PlaceSort) : undefined
  let places: Place[]
  if (id) {
    places = loaded.places.filter((place) => place.id === id).slice(0, 1)
  } else if (ids && !sort && !url.searchParams.get('open') && !url.searchParams.get('cuisine') && !url.searchParams.get('q') && !near && !url.searchParams.get('area')) {
    const want = new Set(ids.split(',').slice(0, 40))
    places = loaded.places.filter((place) => want.has(place.id))
  } else {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 40) || 40))
    const ratedIds = ids ? new Set(ids.split(',').slice(0, 40)) : undefined
    places = filterPlaces(loaded.places, {
      query: url.searchParams.get('q') ?? '',
      area: url.searchParams.get('area') ?? '',
      cuisine: url.searchParams.get('cuisine') ?? '',
      bbox,
      near,
      openNow: url.searchParams.get('open') === '1',
      hideIncomplete: url.searchParams.get('complete') !== '0' && !near && !bbox,
      sort,
      ratedIds,
      limit,
    })
  }
  return NextResponse.json({
    ok: loaded.places.length > 0,
    stale: loaded.stale,
    source: loaded.source,
    total: loaded.places.length,
    places,
  })
}
