'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cuisineLabel, kindLabel, type Place } from '@/tonight/places'
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

function row(label: string, value: string | null) {
  return (
    <div>
      {label} {value || '未有'}
    </div>
  )
}

export function ShopView({ shop }: { shop: Place }) {
  const { ids, toggle } = useSaved()
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState('2')
  const [when, setWhen] = useState('19:30')
  const [done, setDone] = useState(false)
  const saved = ids.includes(shop.id)

  return (
    <TonightShell>
      <article className="shop">
        <div className="shop-hero">
          {shop.image ? <img src={shop.image} alt="" /> : <div className="plate-empty tall">未有相片</div>}
          <span className="badge">{cuisineLabel(shop.cuisine) || kindLabel(shop.kind)}</span>
        </div>
        <h1>{shop.name}</h1>
        {shop.nameEn ? <p className="en">{shop.nameEn}</p> : <p className="en">未有英文名</p>}
        <p className="note">
          {shop.area || '未標地區'} · {kindLabel(shop.kind)}
          {shop.price ? ` · ${shop.price}` : ' · 未標價錢'}
        </p>
        <p className="note">資料來自 OpenStreetMap。未有評分，亦冇編造招牌菜。</p>
        {shop.imageCredit ? <p className="note">相片來源：{shop.imageCredit}</p> : null}
        <div className="actions">
          <button className="book-open" type="button" onClick={() => setOpen(true)}>
            訂位
          </button>
          {shop.phone ? (
            <a className="save" href={`tel:${shop.phone}`}>
              打電話
            </a>
          ) : null}
          <button className="save" type="button" onClick={() => toggle(shop.id)}>
            {saved ? '已收藏' : '收藏'}
          </button>
          <Link className="save" href="/map">
            睇地圖
          </Link>
        </div>
        <div className="facts">
          {row('菜式', shop.cuisine)}
          {row('營業', shop.hours)}
          {row('地址', shop.address)}
          {row('電話', shop.phone)}
          {row('網站', shop.website)}
        </div>
        {open ? (
          <form
            className="sheet"
            onSubmit={(event) => {
              event.preventDefault()
              setDone(true)
            }}
          >
            <b>訂位 · 只係呢部機</b>
            <p>未打去舖頭，亦唔使俾錢。</p>
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
      </article>
    </TonightShell>
  )
}
