import assert from 'node:assert/strict'
import test from 'node:test'
import { cuisineLabel, filterPlaces, matchesChip, parseElement, type Place } from './places'

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
