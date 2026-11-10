import { nearestLand } from './hk-geo'
import { STATIONS } from './transit'

/** Area names that are not already a station label. Famous districts that match a station still get a label when you are zoomed out past the station text. */
const DEFS: { name: string; lon: number; lat: number }[] = [
  { name: '中環', lon: 114.158, lat: 22.282 },
  { name: '灣仔', lon: 114.173, lat: 22.278 },
  { name: '銅鑼灣', lon: 114.185, lat: 22.28 },
  { name: '尖沙咀', lon: 114.172, lat: 22.297 },
  { name: '旺角', lon: 114.169, lat: 22.319 },
  { name: '沙田', lon: 114.188, lat: 22.382 },
  { name: '香港仔', lon: 114.15, lat: 22.248 },
  { name: '赤柱', lon: 114.214, lat: 22.219 },
  { name: '九龍城', lon: 114.19, lat: 22.33 },
  { name: '屯門', lon: 113.977, lat: 22.391 },
  { name: '元朗', lon: 114.032, lat: 22.444 },
  { name: '西貢', lon: 114.271, lat: 22.382 },
  { name: '將軍澳', lon: 114.26, lat: 22.317 },
  { name: '長洲', lon: 114.028, lat: 22.208 },
  { name: '南丫', lon: 114.13, lat: 22.21 },
  { name: '梅窩', lon: 114.0, lat: 22.266 },
  { name: '東涌', lon: 113.941, lat: 22.289 },
]

export interface DistrictLabel {
  name: string
  c: number
  r: number
}

const STATION_NAMES = new Set(STATIONS.map((station) => station.name))

function nearStation(c: number, r: number): boolean {
  return STATIONS.some((station) => Math.max(Math.abs(station.c - c), Math.abs(station.r - r)) <= 3)
}

/** One label per place. A station name wins over a second district tag on the same tiles. */
export const DISTRICTS: DistrictLabel[] = (() => {
  const used = new Set<string>()
  const labels: DistrictLabel[] = []
  for (const def of DEFS) {
    if (STATION_NAMES.has(def.name)) continue
    const spot = nearestLand(def.lon, def.lat, 16)
    if (!spot || nearStation(spot.c, spot.r)) continue
    const key = `${spot.c},${spot.r}`
    if (used.has(key)) continue
    used.add(key)
    labels.push({ name: def.name, c: spot.c, r: spot.r })
  }
  return labels
})()
