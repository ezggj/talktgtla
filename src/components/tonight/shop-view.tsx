'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Shop } from '@/tonight/places'
import { TonightShell } from './shell'

const SAVE_KEY = 'tonight:saved'

function readSaved(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function useSaved() {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => setIds(readSaved()), [])
  const toggle = (id: string) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      localStorage.setItem(SAVE_KEY, JSON.stringify(next))
      return next
    })
  }
  return { ids, toggle }
}

export function ShopView({ shop }: { shop: Shop }) {
  const { ids, toggle } = useSaved()
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState('2')
  const [when, setWhen] = useState('19:30')
  const [done, setDone] = useState(false)
  const saved = ids.includes(shop.id)

  return (
    <TonightShell>
      <article className="shop">
        <div className={`shop-hero plate ${shop.tone}`}>
          <span className="badge">{shop.badge}</span>
        </div>
        <h1>{shop.name}</h1>
        <p className="en">{shop.nameEn}</p>
        <p className="note">
          {shop.area} · {shop.cuisine} · {shop.price}
        </p>
        <p className="note">{shop.blurb}</p>
        <div className="facts">
          <div>營業 {shop.hours}</div>
          <div>點去 {shop.mtr}</div>
        </div>
        <div className="dishes">
          {shop.dishes.map((dish) => (
            <div className="dish" key={dish}>
              {dish}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="book-open" type="button" onClick={() => setOpen(true)}>
            訂位
          </button>
          <button className="save" type="button" onClick={() => toggle(shop.id)}>
            {saved ? '已收藏' : '收藏'}
          </button>
          <Link className="save" href="/map">
            睇地圖
          </Link>
        </div>
        {open ? (
          <form
            className="sheet"
            onSubmit={(event) => {
              event.preventDefault()
              setDone(true)
            }}
          >
            <b>訂位 · 示範</b>
            <label>
              幾多位
              <input value={people} onChange={(event) => setPeople(event.target.value)} inputMode="numeric" />
            </label>
            <label>
              幾點
              <input value={when} onChange={(event) => setWhen(event.target.value)} />
            </label>
            <button type="submit">記低</button>
            {done ? <p>記低咗 {people} 位，{when}。未打去舖頭，亦唔使俾錢。</p> : null}
          </form>
        ) : null}
        <p className="note">原創示範舖，唔係真店。冇付款，冇訂金。</p>
      </article>
    </TonightShell>
  )
}
