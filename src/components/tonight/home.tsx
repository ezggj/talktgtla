'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { mergePlace, readContribs, type Contrib } from '@/tonight/contrib'
import { distanceMeters, formatDistance, walkMinutes } from '@/tonight/geo'
import { CUISINES, cuisineLabel, filterPlaces, kindLabel, type Place, type PlaceSort } from '@/tonight/places'
import { AreaRow } from './area-row'
import { TonightShell } from './shell'
import { useHere } from './use-here'

const ResultsMap = dynamic(() => import('./results-map').then((mod) => mod.ResultsMap), {
  ssr: false,
  loading: () => <p className="note">地圖開緊…</p>,
})

const SORTS: Array<{ id: PlaceSort; label: string; hint: string }> = [
  { id: 'near', label: '最近', hint: '由近到遠。' },
  { id: 'hot', label: '熱門', hint: '熱門係資料齊唔齊（相、營業時間、電話），唔係 Google 人氣。' },
  { id: 'rated', label: '有評分', hint: '只顯示你喺呢部機打過嘅星。OpenStreetMap 冇 Google 評分。' },
  { id: 'photo', label: '有相片', hint: '只顯示有相嘅舖，包括你補充嘅相。' },
]

export function ShopCard({ shop, meters, rating }: { shop: Place; meters?: number | null; rating?: number | null }) {
  return (
    <Link className="card" href={`/shop/${shop.id}`}>
      <div className="plate">
        {shop.image ? <img src={shop.image} alt="" /> : <div className="plate-empty">未有相片</div>}
      </div>
      <div>
        <span className="badge">{cuisineLabel(shop.cuisine) || kindLabel(shop.kind)}</span>
        <b>{shop.name}</b>
        {meters != null ? (
          <p className="meta">
            {formatDistance(meters)} · 行路約 {walkMinutes(meters)} 分鐘
          </p>
        ) : null}
        <p className="meta">
          {shop.area || '未標地區'} · {kindLabel(shop.kind)}
          {shop.price ? ` · ${shop.price}` : ' · 未標價錢'}
        </p>
        {rating ? <p className="meta">你評 {rating} 星 · 唔係 Google</p> : null}
        {shop.address ? <p className="meta">{shop.address}</p> : null}
      </div>
    </Link>
  )
}

function DrawSheet({
  places,
  metersOf,
  ratings,
  onClose,
}: {
  places: Place[]
  metersOf: (place: Place) => number | null
  ratings: Record<string, Contrib>
  onClose: () => void
}) {
  const [spinning, setSpinning] = useState(places.length > 0)
  const [name, setName] = useState('轉緊…')
  const [pick, setPick] = useState<Place | null>(null)

  useEffect(() => {
    if (!places.length) return
    let step = 0
    const timer = window.setInterval(() => {
      setName(places[step % places.length].name)
      step += 1
    }, 70)
    const stop = window.setTimeout(() => {
      window.clearInterval(timer)
      setPick(places[Math.floor(Math.random() * places.length)])
      setSpinning(false)
    }, 880)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [places])

  return (
    <div className="draw-sheet" role="dialog" aria-label="今晚食咩">
      <div className="draw-card">
        <p className="badge">今晚食咩</p>
        <p className="note">喺而家呢個篩選入面抽一間。</p>
        {places.length === 0 ? <p>呢個篩選暫時冇舖可以抽。試下放寬地區或者營業時間。</p> : null}
        {spinning ? <p className="draw-name">{name}</p> : null}
        {pick ? <ShopCard shop={pick} meters={metersOf(pick)} rating={ratings[pick.id]?.rating} /> : null}
        <button type="button" onClick={onClose}>
          收埋
        </button>
      </div>
    </div>
  )
}

export function TonightHome() {
  const { here, locState, ask } = useHere()
  const pinned = useRef(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'near' | 'all' | 'area'>('near')
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [radius, setRadius] = useState<1000 | 2000>(1000)
  const [sort, setSort] = useState<PlaceSort>('near')
  const [openNow, setOpenNow] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [places, setPlaces] = useState<Place[]>([])
  const [ready, setReady] = useState(false)
  const [note, setNote] = useState('睇緊你附近…')
  const [draw, setDraw] = useState(false)
  const [contribs, setContribs] = useState<Record<string, Contrib>>({})

  useEffect(() => setContribs(readContribs()), [])

  useEffect(() => {
    if (locState === 'off' && !here && !pinned.current) {
      setScope('all')
      setSort((current) => (current === 'near' ? 'hot' : current))
    }
    if (locState === 'ok' && here && !pinned.current) setScope('near')
  }, [locState, here])

  useEffect(() => {
    if (locState === 'asking' || (scope === 'near' && !here)) return
    const handle = window.setTimeout(() => {
      const contrib = readContribs()
      setContribs(contrib)
      const params = new URLSearchParams({ limit: '60' })
      if (query.trim()) params.set('q', query.trim())
      if (cuisine) params.set('cuisine', cuisine)
      if (openNow) params.set('open', '1')
      const nearOn = scope === 'near' && here
      const sortParam: PlaceSort = sort === 'near' && !nearOn ? 'hot' : sort
      params.set('sort', sortParam)
      if (nearOn && here) {
        params.set('lat', String(here.lat))
        params.set('lng', String(here.lng))
        params.set('radius', String(radius))
        params.set('complete', '0')
      } else if (scope === 'area' && area) {
        params.set('area', area)
        params.set('complete', '1')
      } else {
        params.set('complete', '1')
      }
      if (sort === 'rated') {
        const ids = Object.entries(contrib)
          .filter(([, item]) => item.rating)
          .map(([id]) => id)
        if (!ids.length) {
          setPlaces([])
          setReady(true)
          setNote('未有你自己嘅評分。入舖頭可以打 1 至 5 星，呢個唔係 Google 分。')
          return
        }
        params.set('ids', ids.slice(0, 40).join(','))
      }
      void fetch(`/api/places?${params}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then(async (body: { places?: Place[]; total?: number; stale?: boolean; ok?: boolean }) => {
          let rows = body.places ?? []
          if (sort === 'photo') {
            const extra = Object.entries(contrib)
              .filter(([, item]) => item.photo)
              .map(([id]) => id)
              .slice(0, 20)
            if (extra.length) {
              const more = (await fetch(`/api/places?ids=${extra.join(',')}`, { cache: 'no-store' }).then((response) => response.json())) as {
                places?: Place[]
              }
              const seen = new Set(rows.map((place) => place.id))
              rows = rows.concat((more.places ?? []).filter((place) => !seen.has(place.id)))
            }
          }
          const merged = rows.map((place) => mergePlace(place, contrib[place.id]))
          const ratedIds = new Set(
            Object.entries(contrib)
              .filter(([, item]) => item.rating)
              .map(([id]) => id),
          )
          const shown = filterPlaces(merged, {
            query,
            cuisine,
            area: scope === 'area' ? area : '',
            near: nearOn && here ? { lat: here.lat, lng: here.lng, radiusM: radius } : undefined,
            openNow,
            hideIncomplete: !nearOn,
            sort: sortParam,
            ratedIds,
            now: new Date(),
          })
          setPlaces(shown)
          setReady(true)
          const where = nearOn ? `附近 ${radius / 1000}km` : scope === 'area' ? area : '全港有地區標'
          setNote(
            body.ok
              ? `名單來自 OpenStreetMap，收錄 ${body.total ?? 0} 間。而家睇 ${where}。未標地區嘅舖預設收起，我附近仍然會顯示。可能冇 Google 地圖咁齊。${body.stale ? ' 用緊稍為舊嘅快取。' : ''}`
              : '地圖資料暫時攞唔到，陣間再試。',
          )
        })
        .catch(() => {
          setReady(true)
          setNote('地圖資料暫時攞唔到，陣間再試。')
        })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, scope, area, cuisine, radius, sort, openNow, here, locState])

  const metersOf = (place: Place) => (here ? distanceMeters(here.lat, here.lng, place.lat, place.lng) : null)
  const hint = SORTS.find((item) => item.id === sort)?.hint

  return (
    <TonightShell>
      <header className="topbar">
        <h1 className="word">
          今晚食乜
          <small>香港 · OpenStreetMap</small>
        </h1>
        <button className="draw-open" type="button" onClick={() => setDraw(true)}>
          今晚食咩
        </button>
      </header>
      <label className="search search-strong">
        <span aria-hidden="true">搵</span>
        <input value={query} placeholder="店名、菜式、地區…" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {locState === 'off' && !here ? <p className="note">定位未開。而家睇全港有地區標嘅舖。想睇 1 公里內，撳 📍 我附近，再允許定位。</p> : null}
      {locState === 'asking' ? <p className="note">睇緊你附近…未開定位就會改睇全港。</p> : null}
      <AreaRow
        nearOn={scope === 'near'}
        allOn={scope === 'all'}
        area={scope === 'area' ? area : ''}
        onNear={() => {
          pinned.current = false
          setScope('near')
          setArea('')
          setSort('near')
          ask()
        }}
        onAll={() => {
          pinned.current = true
          setScope('all')
          setArea('')
          setSort((current) => (current === 'near' ? 'hot' : current))
        }}
        onArea={(name) => {
          pinned.current = true
          setScope('area')
          setArea(name)
          setSort((current) => (current === 'near' ? 'hot' : current))
        }}
      />
      {scope === 'near' && here ? (
        <div className="chips" aria-label="距離">
          <button type="button" className={radius === 1000 ? 'chip on' : 'chip'} onClick={() => setRadius(1000)}>
            1km
          </button>
          <button type="button" className={radius === 2000 ? 'chip on' : 'chip'} onClick={() => setRadius(2000)}>
            2km
          </button>
        </div>
      ) : null}
      <div className="chips" aria-label="菜式">
        {CUISINES.map((item) => (
          <button key={item} type="button" className={cuisine === item ? 'chip on' : 'chip'} onClick={() => setCuisine(cuisine === item ? '' : item)}>
            {item}
          </button>
        ))}
        <button type="button" className={openNow ? 'chip on' : 'chip'} onClick={() => setOpenNow((value) => !value)}>
          而家營業中
        </button>
      </div>
      <div className="chips" aria-label="排序">
        {SORTS.map((item) => (
          <button key={item.id} type="button" className={sort === item.id ? 'chip on' : 'chip'} onClick={() => setSort(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="note">{hint}</p>
      <div className="results-bar">
        <h2 className="section-title">{ready ? `${places.length} 間` : '載入緊'}</h2>
        <div className="view-toggle" aria-label="清單或地圖">
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            清單
          </button>
          <button type="button" className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>
            地圖
          </button>
        </div>
      </div>
      {view === 'map' ? (
        <ResultsMap places={places} metersOf={metersOf} />
      ) : (
        <div className="cards">
          {places.map((shop) => (
            <ShopCard key={shop.id} shop={shop} meters={metersOf(shop)} rating={contribs[shop.id]?.rating} />
          ))}
        </div>
      )}
      {ready && places.length === 0 ? <p className="note">呢個組合暫時冇結果。試下換距離、菜式，或者關掉而家營業中。</p> : null}
      <p className="note">{note}</p>
      {draw ? <DrawSheet places={places} metersOf={metersOf} ratings={contribs} onClose={() => setDraw(false)} /> : null}
    </TonightShell>
  )
}
