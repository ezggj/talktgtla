'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readContribs, writeContrib, type Contrib } from '@/tonight/contrib'
import { distanceMeters, formatDistance, readHere, walkMinutes } from '@/tonight/geo'
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

async function shrinkPhoto(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const data = canvas.toDataURL('image/jpeg', 0.7)
  return data.length > 280000 ? null : data
}

export function ShopView({ shop }: { shop: Place }) {
  const { ids, toggle } = useSaved()
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState('2')
  const [when, setWhen] = useState('19:30')
  const [done, setDone] = useState(false)
  const [contrib, setContrib] = useState<Contrib>({})
  const [meters, setMeters] = useState<number | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  const saved = ids.includes(shop.id)
  const shown = {
    ...shop,
    image: contrib.photo || shop.image,
    imageCredit: contrib.photo ? '你補充 · 只係呢部機' : shop.imageCredit,
    hours: contrib.hours?.trim() ? contrib.hours : shop.hours,
    price: contrib.price?.trim() ? contrib.price : shop.price,
  }

  useEffect(() => {
    setContrib(readContribs()[shop.id] ?? {})
    const here = readHere()
    setMeters(here ? distanceMeters(here.lat, here.lng, shop.lat, shop.lng) : null)
  }, [shop.id, shop.lat, shop.lng])

  const saveContrib = (patch: Contrib) => {
    setContrib(writeContrib(shop.id, patch))
  }

  return (
    <TonightShell>
      <article className="shop">
        <div className="shop-hero">
          {shown.image ? <img src={shown.image} alt="" /> : <div className="plate-empty tall">未有相片</div>}
          <span className="badge">{cuisineLabel(shop.cuisine) || kindLabel(shop.kind)}</span>
        </div>
        <h1>{shop.name}</h1>
        {shop.nameEn ? <p className="en">{shop.nameEn}</p> : <p className="en">未有英文名</p>}
        <p className="note">
          {shop.area || '未標地區'} · {kindLabel(shop.kind)}
          {shown.price ? ` · ${shown.price}` : ' · 未標價錢'}
        </p>
        {meters != null ? (
          <p className="note">
            距離你 {formatDistance(meters)} · 行路約 {walkMinutes(meters)} 分鐘
          </p>
        ) : null}
        <p className="note">資料來自 OpenStreetMap。你補充嘅相、價錢、時間同星只係呢部機，唔係 Google 評分，亦冇編造招牌菜。</p>
        {shown.imageCredit ? <p className="note">相片來源：{shown.imageCredit}</p> : null}
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
          {row('營業', shown.hours)}
          {row('地址', shop.address)}
          {row('電話', shop.phone)}
          {row('網站', shop.website)}
          {row('你嘅星', contrib.rating ? `${contrib.rating} 星` : null)}
        </div>
        <form
          className="sheet"
          key={`${shop.id}:${contrib.rating ?? ''}:${contrib.hours ?? ''}:${contrib.price ?? ''}`}
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            saveContrib({
              price: String(data.get('price') ?? ''),
              hours: String(data.get('hours') ?? ''),
              rating: Number(data.get('rating') ?? 0) || null,
            })
          }}
        >
          <b>補充資料 · 只係呢部機</b>
          <p>相、價錢、營業時間同星都係你自己填，唔會當係 Google 資料。</p>
          <label>
            我嘅星（1-5）
            <input name="rating" defaultValue={contrib.rating ?? ''} inputMode="numeric" placeholder="未評" />
          </label>
          <label>
            價錢
            <input name="price" defaultValue={contrib.price ?? ''} placeholder="$ / $$ / $$$" />
          </label>
          <label>
            營業時間
            <input name="hours" defaultValue={contrib.hours ?? ''} placeholder="例如 Mo-Su 11:00-22:00" />
          </label>
          <label className="file-pick">
            揀相
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void shrinkPhoto(file).then((photo) => {
                  if (!photo) {
                    setPhotoNote('張相太大，未存到。')
                    return
                  }
                  saveContrib({ photo })
                  setPhotoNote('相已記低。')
                })
              }}
            />
          </label>
          {photoNote ? <p>{photoNote}</p> : null}
          <button type="submit">記低補充</button>
        </form>
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
