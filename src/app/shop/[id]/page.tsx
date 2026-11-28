import { Suspense } from 'react'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { ShopView } from '@/components/tonight/shop-view'
import { loadPlaces } from '@/tonight/osm'

async function ShopBody({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params
  const loaded = await loadPlaces()
  const shop = loaded.places.find((place) => place.id === id)
  if (!shop) notFound()
  return <ShopView shop={shop} />
}

export default function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: '#3a2418' }}>舖頭載入緊…</p>}>
      <ShopBody params={params} />
    </Suspense>
  )
}
