'use client'

import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { AREAS, CUISINES, cuisineLabel, kindLabel, type Place } from '@/tonight/places'
import { ShopCard } from './home'
import 'leaflet/dist/leaflet.css'

function pin(place: Place) {
  const letter = (cuisineLabel(place.cuisine) || kindLabel(place.kind) || place.name).slice(0, 1)
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin"><span>${letter}</span></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function Fly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 0.5 })
  }, [lat, lng, map])
  return null
}

function Bounds({ onChange }: { onChange: (bbox: string) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const box = map.getBounds()
      onChange([box.getSouth(), box.getWest(), box.getNorth(), box.getEast()].map((value) => value.toFixed(3)).join(','))
    },
  })
  useEffect(() => {
    const box = map.getBounds()
    onChange([box.getSouth(), box.getWest(), box.getNorth(), box.getEast()].map((value) => value.toFixed(3)).join(','))
  }, [map, onChange])
  return null
}

export function NightMap() {
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [bbox, setBbox] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [picked, setPicked] = useState<Place | null>(null)
  const [note, setNote] = useState('地圖載入緊…')
  const focus = AREAS.find((item) => item.name === area)

  useEffect(() => {
    if (!bbox && !area) return
    const params = new URLSearchParams({ limit: '160' })
    if (area) params.set('area', area)
    else if (bbox) params.set('bbox', bbox)
    if (cuisine) params.set('cuisine', cuisine)
    const handle = window.setTimeout(() => {
      void fetch(`/api/places?${params}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((body: { places?: Place[]; ok?: boolean }) => {
          setPlaces(body.places ?? [])
          setNote(body.ok ? '名單來自 OpenStreetMap，畫面只顯示而家呢一截。' : '地圖資料暫時攞唔到，陣間再試。')
        })
        .catch(() => setNote('地圖資料暫時攞唔到，陣間再試。'))
    }, 300)
    return () => window.clearTimeout(handle)
  }, [bbox, area, cuisine])

  return (
    <div className="map-page">
      <header className="topbar">
        <h1 className="word">
          地圖
          <small>公開街道圖 · 香港</small>
        </h1>
      </header>
      <div className="areas">
        <button type="button" className={area === '' ? 'area on' : 'area'} onClick={() => setArea('')}>
          全港
        </button>
        {AREAS.map((item) => (
          <button key={item.id} type="button" className={area === item.name ? 'area on' : 'area'} onClick={() => setArea(item.name)}>
            {item.name}
          </button>
        ))}
      </div>
      <div className="chips">
        {CUISINES.map((item) => (
          <button key={item} type="button" className={cuisine === item ? 'chip on' : 'chip'} onClick={() => setCuisine(cuisine === item ? '' : item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="map-frame">
        <MapContainer center={focus ? [focus.lat, focus.lng] : [22.32, 114.17]} zoom={focus ? 14 : 12} scrollWheelZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {focus ? <Fly lat={focus.lat} lng={focus.lng} /> : null}
          <Bounds onChange={setBbox} />
          {places.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]} icon={pin(place)} eventHandlers={{ click: () => setPicked(place) }} />
          ))}
        </MapContainer>
      </div>
      {picked ? (
        <div className="preview">
          <ShopCard shop={picked} />
        </div>
      ) : (
        <p className="note">{note} 撳針就睇到舖頭。</p>
      )}
    </div>
  )
}
