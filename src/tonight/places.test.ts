import assert from 'node:assert/strict'
import test from 'node:test'
import { mergePlace } from './contrib'
import { formatDistance, walkMinutes } from './geo'
import { isOpenAt } from './hours'
import { filterPlaces, hotScore, matchesChip, parseElement, cuisineLabel, type Place } from './places'

const element = {
  type: 'node',
  id: 42,
  lat: 22.319,
  lon: 114.169,
  tags: {
    name: '旺角麵館',
    'name:en': 'Mong Kok Noodles',
    amenity: 'restaurant',
    cuisine: 'ramen',
    opening_hours: '12:00-22:00',
    phone: '+852 2000 0000',
    image: 'https://example.com/private.jpg',
    'addr:street': '豉油街',
  },
}

test('an OSM element keeps real tags and does not invent a photo or a dish list', () => {
  const place = parseElement(element)
  assert.ok(place)
  assert.equal(place?.id, 'node-42')
  assert.equal(place?.name, '旺角麵館')
  assert.equal(place?.nameEn, 'Mong Kok Noodles')
  assert.equal(place?.area, '旺角')
  assert.equal(place?.hours, '12:00-22:00')
  assert.equal(place?.phone, '+852 2000 0000')
  assert.equal(place?.image, null)
  assert.equal(place?.address, '豉油街')
  assert.equal(matchesChip(place as Place, '拉麵'), true)
  assert.equal(matchesChip(place as Place, '壽司'), false)
})

test('a wikimedia file is kept and a nameless node is dropped', () => {
  const photo = parseElement({
    type: 'way',
    id: 7,
    center: { lat: 22.28, lon: 114.16 },
    tags: { 'name:zh-Hant': '中環冰室', amenity: 'cafe', wikimedia_commons: 'File:Example cafe.jpg' },
  })
  assert.ok(photo?.image?.includes('commons.wikimedia.org'))
  assert.equal(photo?.imageCredit, 'Wikimedia Commons')
  assert.equal(parseElement({ type: 'node', id: 1, lat: 22.3, lon: 114.2, tags: { amenity: 'restaurant' } }), null)
})

test('known cuisine tags get a Cantonese label and unknown tags stay out of that label', () => {
  assert.equal(cuisineLabel('chinese;hotpot'), '中菜、火鍋')
  assert.equal(cuisineLabel('not_a_real_cuisine'), null)
})

function sample(id: string, patch: Partial<Place>): Place {
  return {
    id,
    name: id,
    nameEn: null,
    area: '中環',
    kind: 'restaurant',
    cuisine: null,
    price: null,
    lat: 22.28,
    lng: 114.16,
    hours: null,
    phone: null,
    website: null,
    address: null,
    image: null,
    imageCredit: null,
    ...patch,
  }
}

test('nearby results sort by distance and still include shops with no district', () => {
  const near = { lat: 22.28, lng: 114.16, radiusM: 1000 }
  const places = [
    sample('far', { name: '遠', area: '旺角', lat: 22.32, lng: 114.17 }),
    sample('close-bare', { name: '近', area: null, lat: 22.281, lng: 114.161 }),
    sample('mid', { name: '中', area: '中環', lat: 22.285, lng: 114.165 }),
  ]
  const ids = filterPlaces(places, { near, hideIncomplete: true, sort: 'near' }).map((place) => place.id)
  assert.deepEqual(ids, ['close-bare', 'mid'])
  assert.equal(formatDistance(350), '350m')
  assert.equal(formatDistance(1200), '1.2km')
  assert.equal(walkMinutes(350), 4)
})

test('browse hides shops with no district, and open-now ignores missing hours', () => {
  const wednesdayNoon = new Date('2026-11-25T04:00:00.000Z')
  const saturdayNoon = new Date('2026-11-28T04:00:00.000Z')
  const places = [
    sample('bare', { area: null, hours: 'Mo-Su 00:00-23:59' }),
    sample('open', { hours: 'Mo-Fr 09:00-18:00', phone: '+852 1', image: 'https://upload.wikimedia.org/a.jpg' }),
    sample('shut', { hours: 'Sa-Su 09:00-18:00' }),
    sample('unknown', { hours: null }),
  ]
  assert.deepEqual(
    filterPlaces(places, { hideIncomplete: true, openNow: true, now: wednesdayNoon }).map((place) => place.id),
    ['open'],
  )
  assert.equal(filterPlaces(places, { hideIncomplete: true, openNow: true, now: saturdayNoon }).some((place) => place.id === 'open'), false)
  assert.equal(isOpenAt('24/7', wednesdayNoon), true)
  assert.equal(isOpenAt('Mo-Su,PH 11:00-22:00', wednesdayNoon), true)
  assert.equal(isOpenAt(null, wednesdayNoon), null)
  assert.equal(isOpenAt('not hours', wednesdayNoon), null)
  const fridayNight = new Date('2026-11-27T12:00:00.000Z')
  const saturdayEarly = new Date('2026-11-27T17:00:00.000Z')
  assert.equal(isOpenAt('Fr 18:00-02:00', fridayNight), true)
  assert.equal(isOpenAt('Fr 18:00-02:00', saturdayEarly), true)
  assert.ok(hotScore(places[1]) > hotScore(places[3]))
  const contributed = mergePlace(sample('user', { hours: null, image: null }), { hours: '24/7', photo: 'data:image/jpeg;base64,abc' })
  assert.equal(filterPlaces([contributed], { openNow: true, now: wednesdayNoon, sort: 'photo' }).length, 1)
  assert.equal(contributed.imageCredit, '你補充 · 只係呢部機')
})

test('filters stay inside the requested district and box', () => {
  const places: Place[] = [
    {
      id: 'node-1',
      name: '中環冰室',
      nameEn: null,
      area: '中環',
      kind: 'cafe',
      cuisine: null,
      price: null,
      lat: 22.28,
      lng: 114.16,
      hours: null,
      phone: null,
      website: null,
      address: null,
      image: null,
      imageCredit: null,
    },
    {
      id: 'node-2',
      name: '旺角火鍋',
      nameEn: null,
      area: '旺角',
      kind: 'restaurant',
      cuisine: 'hotpot',
      price: null,
      lat: 22.32,
      lng: 114.17,
      hours: null,
      phone: null,
      website: null,
      address: null,
      image: null,
      imageCredit: null,
    },
  ]
  assert.deepEqual(filterPlaces(places, { area: '旺角', cuisine: '火鍋' }).map((place) => place.id), ['node-2'])
  assert.equal(filterPlaces(places, { bbox: [22.27, 114.15, 22.29, 114.165] }).length, 1)
})
