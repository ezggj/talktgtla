import { nearestLand } from './hk-geo'

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

export const DISTRICTS: DistrictLabel[] = DEFS.flatMap((def) => {
  const spot = nearestLand(def.lon, def.lat, 4)
  return spot ? [{ name: def.name, c: spot.c, r: spot.r }] : []
})
