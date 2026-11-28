import { connection, NextResponse } from 'next/server'
import { filterPlaces, type Place } from '@/tonight/places'
import { loadPlaces } from '@/tonight/osm'

export async function GET(request: Request) {
  await connection()
  const url = new URL(request.url)
  const loaded = await loadPlaces()
  const bboxRaw = url.searchParams.get('bbox')
  const parts = bboxRaw?.split(',').map(Number) ?? []
  const bbox = parts.length === 4 && parts.every((value) => Number.isFinite(value)) ? (parts as [number, number, number, number]) : undefined
  const id = url.searchParams.get('id')
  const ids = url.searchParams.get('ids')
  let places: Place[]
  if (id) {
    places = loaded.places.filter((place) => place.id === id).slice(0, 1)
  } else if (ids) {
    const want = new Set(ids.split(',').slice(0, 40))
    places = loaded.places.filter((place) => want.has(place.id))
  } else {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 40) || 40))
    places = filterPlaces(loaded.places, {
      query: url.searchParams.get('q') ?? '',
      area: url.searchParams.get('area') ?? '',
      cuisine: url.searchParams.get('cuisine') ?? '',
      bbox,
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
