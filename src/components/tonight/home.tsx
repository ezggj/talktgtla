'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AREAS, CUISINES, filterShops, todaysPicks, type Shop } from '@/tonight/places'
import { TonightShell } from './shell'

export function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link className="card" href={`/shop/${shop.id}`}>
      <div className={`plate ${shop.tone}`}>{shop.dishes[0]}</div>
      <div>
        <span className="badge">{shop.badge}</span>
        <b>{shop.name}</b>
        <p className="meta">
          {shop.area} · {shop.cuisine} · {shop.price}
        </p>
        <p className="meta">{shop.blurb}</p>
      </div>
    </Link>
  )
}

export function TonightHome() {
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const picks = useMemo(() => todaysPicks(), [])
  const list = useMemo(() => filterShops({ query, area, cuisine }), [query, area, cuisine])
  const showing = query || area || cuisine ? list : picks

  return (
    <TonightShell>
      <header className="topbar">
        <h1 className="word">
          今晚食乜
          <small>香港街頭</small>
        </h1>
      </header>
      <label className="search">
        <input value={query} placeholder="搜茶餐廳、叉燒、旺角…" onChange={(event) => setQuery(event.target.value)} />
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
      <h2 className="section-title">{query || area || cuisine ? '搵到呢啲' : '街坊推介'}</h2>
      <div className="cards">
        {showing.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
      {showing.length === 0 ? <p className="note">呢個組合暫時冇示範舖。試下換區或者換菜式。</p> : null}
      <p className="note">舖頭、菜式同時間都係原創示範，唔係真店，亦唔使俾錢。</p>
    </TonightShell>
  )
}
