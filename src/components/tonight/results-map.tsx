'use client'

import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { cuisineLabel, kindLabel, type Place } from '@/tonight/places'
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

function Fit({ places }: { places: Place[] }) {
  const map = useMap()
  useEffect(() => {
    if (!places.length) {
      map.setView([22.32, 114.17], 12)
      return
    }
    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng]))
    map.fitBounds(bounds.pad(0.25), { maxZoom: 16 })
  }, [places, map])
  return null
}

export function ResultsMap({
  places,
  metersOf,
}: {
  places: Place[]
  metersOf: (place: Place) => number | null
}) {
  const [picked, setPicked] = useState<Place | null>(null)
  const center: [number, number] = places[0] ? [places[0].lat, places[0].lng] : [22.32, 114.17]

  return (
    <div>
      <div className="map-frame compact">
        <MapContainer center={center} zoom={15} scrollWheelZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Fit places={places} />
          {places.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]} icon={pin(place)} eventHandlers={{ click: () => setPicked(place) }} />
          ))}
        </MapContainer>
      </div>
      {picked ? (
        <div className="preview">
          <ShopCard shop={picked} meters={metersOf(picked)} />
        </div>
      ) : (
        <p className="note">地圖只顯示而家篩選到嘅舖。放大就冇咁重疊。撳針睇距離。</p>
      )}
    </div>
  )
}
