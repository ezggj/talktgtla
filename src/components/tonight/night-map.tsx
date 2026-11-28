'use client'

import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { distanceMeters } from '@/tonight/geo'
import { AREAS, CUISINES, cuisineLabel, kindLabel, type Place } from '@/tonight/places'
import { AreaRow } from './area-row'
import { ShopCard } from './home'
import { useHere } from './use-here'
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

function Fly({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.5 })
  }, [lat, lng, zoom, map])
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
  const { here, ask } = useHere()
  const [near, setNear] = useState(false)
  const [radius, setRadius] = useState<1000 | 2000>(1000)
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [bbox, setBbox] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [picked, setPicked] = useState<Place | null>(null)
  const [note, setNote] = useState('地圖載入緊…')
  const focus = near && here ? { lat: here.lat, lng: here.lng, zoom: radius === 1000 ? 15 : 14 } : AREAS.find((item) => item.name === area)

  useEffect(() => {
    if (!near && !bbox && !area) return
    if (near && !here) return
    const params = new URLSearchParams({ limit: '80' })
    if (near && here) {
      params.set('lat', String(here.lat))
      params.set('lng', String(here.lng))
      params.set('radius', String(radius))
      params.set('complete', '0')
      params.set('sort', 'near')
    } else if (area) params.set('area', area)
    else if (bbox) params.set('bbox', bbox)
    if (cuisine) params.set('cuisine', cuisine)
    const handle = window.setTimeout(() => {
      void fetch(`/api/places?${params}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((body: { places?: Place[]; ok?: boolean }) => {
          setPlaces(body.places ?? [])
          setNote(body.ok ? '名單來自 OpenStreetMap。附近或者放大先唔會疊到一舊。' : '地圖資料暫時攞唔到，陣間再試。')
        })
        .catch(() => setNote('地圖資料暫時攞唔到，陣間再試。'))
    }, 300)
    return () => window.clearTimeout(handle)
  }, [bbox, area, cuisine, near, here, radius])

  return (
    <div className="map-page">
      <header className="topbar">
        <h1 className="word">
          地圖
          <small>公開街道圖 · 香港</small>
        </h1>
      </header>
      <AreaRow
        nearOn={near}
        allOn={!near && area === ''}
        area={area}
        onNear={() => {
          setNear(true)
          setArea('')
          ask()
        }}
        onAll={() => {
          setNear(false)
          setArea('')
        }}
        onArea={(name) => {
          setNear(false)
          setArea(name)
        }}
      />
      {near ? (
        <div className="chips">
          <button type="button" className={radius === 1000 ? 'chip on' : 'chip'} onClick={() => setRadius(1000)}>
            1km
          </button>
          <button type="button" className={radius === 2000 ? 'chip on' : 'chip'} onClick={() => setRadius(2000)}>
            2km
          </button>
        </div>
      ) : null}
      <div className="chips">
        {CUISINES.map((item) => (
          <button key={item} type="button" className={cuisine === item ? 'chip on' : 'chip'} onClick={() => setCuisine(cuisine === item ? '' : item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="map-frame">
        <MapContainer center={focus ? [focus.lat, focus.lng] : here ? [here.lat, here.lng] : [22.32, 114.17]} zoom={focus && 'zoom' in focus ? focus.zoom : focus ? 15 : here ? 15 : 13} scrollWheelZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {focus ? <Fly lat={focus.lat} lng={focus.lng} zoom={'zoom' in focus ? focus.zoom : 15} /> : here ? <Fly lat={here.lat} lng={here.lng} zoom={15} /> : null}
          <Bounds onChange={setBbox} />
          {places.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]} icon={pin(place)} eventHandlers={{ click: () => setPicked(place) }} />
          ))}
        </MapContainer>
      </div>
      {picked ? (
        <div className="preview">
          <ShopCard shop={picked} meters={here ? distanceMeters(here.lat, here.lng, picked.lat, picked.lng) : null} />
        </div>
      ) : (
        <p className="note">{note} 撳針就睇到舖頭。</p>
      )}
    </div>
  )
}
