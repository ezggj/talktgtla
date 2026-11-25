'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AREAS, CUISINES, filterShops, type Shop } from '@/tonight/places'
import { ShopCard } from './home'
import 'leaflet/dist/leaflet.css'

function pin(shop: Shop) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin"><span>${shop.cuisine.slice(0, 1)}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
  })
}

function Fly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 0.6 })
  }, [lat, lng, map])
  return null
}

export function NightMap() {
  const [area, setArea] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [picked, setPicked] = useState<Shop | null>(null)
  const shops = useMemo(() => filterShops({ area, cuisine }), [area, cuisine])
  const focus = AREAS.find((item) => item.name === area)

  return (
    <div className="map-page">
      <header className="topbar">
        <h1 className="word">
          地圖
          <small>公開圖磚 · 香港</small>
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
        <MapContainer center={[22.302, 114.174]} zoom={12} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {focus ? <Fly lat={focus.lat} lng={focus.lng} /> : null}
          {shops.map((shop) => (
            <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={pin(shop)} eventHandlers={{ click: () => setPicked(shop) }} />
          ))}
        </MapContainer>
      </div>
      {picked ? (
        <div className="preview">
          <p className="meta">撳咗 {picked.area}</p>
          <ShopCard shop={picked} />
        </div>
      ) : (
        <p className="note">撳地圖上嘅針，就睇到舖頭。用公開街道圖，未用私人匙。</p>
      )}
    </div>
  )
}
