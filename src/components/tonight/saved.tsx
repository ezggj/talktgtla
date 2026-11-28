'use client'

import { useEffect, useState } from 'react'
import { distanceMeters, readHere } from '@/tonight/geo'
import type { Place } from '@/tonight/places'
import { ShopCard } from './home'
import { TonightShell } from './shell'
import { useSaved } from './shop-view'

export function SavedPage() {
  const { ids } = useSaved()
  const [shops, setShops] = useState<Place[]>([])
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => setHere(readHere()), [])

  useEffect(() => {
    if (!ids.length) {
      setShops([])
      return
    }
    void fetch(`/api/places?ids=${ids.join(',')}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { places?: Place[] }) => setShops(body.places ?? []))
      .catch(() => setShops([]))
  }, [ids])

  return (
    <TonightShell>
      <header className="topbar">
        <h1 className="word">
          收藏
          <small>只係呢部機</small>
        </h1>
      </header>
      <div className="cards">
        {shops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} meters={here ? distanceMeters(here.lat, here.lng, shop.lat, shop.lng) : null} />
        ))}
      </div>
      {ids.length === 0 ? <p className="note">未有收藏。入去舖頭頁撳收藏就得。</p> : null}
    </TonightShell>
  )
}
