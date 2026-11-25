'use client'

import { SHOPS } from '@/tonight/places'
import { ShopCard } from './home'
import { TonightShell } from './shell'
import { useSaved } from './shop-view'

export function SavedPage() {
  const { ids } = useSaved()
  const shops = SHOPS.filter((shop) => ids.includes(shop.id))
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
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
      {shops.length === 0 ? <p className="note">未有收藏。入去舖頭頁撳收藏就得。</p> : null}
    </TonightShell>
  )
}
