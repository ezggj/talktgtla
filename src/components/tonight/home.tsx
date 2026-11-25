'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AREAS, CUISINES, cuisineLabel, kindLabel, type Place } from '@/tonight/places'
import { TonightShell } from './shell'

export function ShopCard({ shop }: { shop: Place }) {
  return (
    <Link className="card" href={`/shop/${shop.id}`}>
      <div className="plate">
        {shop.image ? <img src={shop.image} alt="" /> : <div className="plate-empty">未有相片</div>}
      </div>
      <div>
        <span className="badge">{cuisineLabel(shop.cuisine) || kindLabel(shop.kind)}</span>
        <b>{shop.name}</b>
        <p className="meta">
          {shop.area || '未標地區'} · {kindLabel(shop.kind)}
          {shop.price ? ` · ${shop.price}` : ' · 未標價錢'}
        </p>
        {shop.address ? <p className="meta">{shop.address}</p> : null}
      </div>
    </Link>
  )
}

export function TonightHome() {
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [ready, setReady] = useState(false)
  const [note, setNote] = useState('名單載入緊…')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: '40' })
      if (query.trim()) params.set('q', query.trim())
      if (area) params.set('area', area)
      if (cuisine) params.set('cuisine', cuisine)
      void fetch(`/api/places?${params}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((body: { places?: Place[]; total?: number; stale?: boolean; ok?: boolean }) => {
          setPlaces(body.places ?? [])
          setReady(true)
          setNote(
            body.ok
              ? `名單來自 OpenStreetMap，而家收錄 ${body.total ?? 0} 間。可能冇 Google 地圖咁齊，未有嘅欄會寫明。${body.stale ? ' 用緊稍為舊嘅快取。' : ''}`
              : '地圖資料暫時攞唔到，陣間再試。',
          )
        })
        .catch(() => {
          setReady(true)
          setNote('地圖資料暫時攞唔到，陣間再試。')
        })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, area, cuisine])

  return (
    <TonightShell>
      <header className="topbar">
        <h1 className="word">
          今晚食乜
          <small>香港 · OpenStreetMap</small>
        </h1>
      </header>
      <label className="search">
        <input value={query} placeholder="搜店名、菜式、地區…" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="areas" aria-label="地區">
        <button type="button" className={area === '' ? 'area on' : 'area'} onClick={() => setArea('')}>
          全港
        </button>
        {AREAS.map((item) => (
          <button key={item.id} type="button" className={area === item.name ? 'area on' : 'area'} onClick={() => setArea(item.name)}>
            {item.name}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="菜式">
        {CUISINES.map((item) => (
          <button key={item} type="button" className={cuisine === item ? 'chip on' : 'chip'} onClick={() => setCuisine(cuisine === item ? '' : item)}>
            {item}
          </button>
        ))}
      </div>
      <h2 className="section-title">{query || area || cuisine ? `搵到 ${places.length} 間` : '而家睇到'}</h2>
      <div className="cards">
        {places.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
      {ready && places.length === 0 ? <p className="note">呢個組合暫時冇結果。試下換區或者換菜式。</p> : null}
      <p className="note">{note}</p>
    </TonightShell>
  )
}
