import { notFound } from 'next/navigation'
import { ShopView } from '@/components/tonight/shop-view'
import { shopById, SHOPS } from '@/tonight/places'

export function generateStaticParams() {
  return SHOPS.map((shop) => ({ id: shop.id }))
}

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shop = shopById(id)
  if (!shop) notFound()
  return <ShopView shop={shop} />
}
