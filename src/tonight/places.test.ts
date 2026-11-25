import assert from 'node:assert/strict'
import test from 'node:test'
import { AREAS, filterShops, shopById, SHOPS } from './places'

test('every demo shop sits in a real Hong Kong district we list', () => {
  const names = new Set(AREAS.map((area) => area.name))
  for (const shop of SHOPS) {
    assert.equal(names.has(shop.area), true, shop.name)
    assert.ok(shop.lat > 22.2 && shop.lat < 22.4)
    assert.ok(shop.lng > 114.1 && shop.lng < 114.25)
    assert.equal(shop.dishes.length > 0, true)
  }
})

test('search and chips narrow the list without inventing a shop', () => {
  const tea = filterShops({ cuisine: '茶餐廳' })
  assert.ok(tea.every((shop) => shop.cuisine === '茶餐廳'))
  assert.ok(tea.length >= 2)
  const mongkok = filterShops({ area: '旺角', cuisine: '火鍋' })
  assert.deepEqual(mongkok.map((shop) => shop.id), ['side-pot'])
  const found = filterShops({ query: '奶茶' })
  assert.ok(found.some((shop) => shop.dishes.some((dish) => dish.includes('奶茶'))))
  assert.equal(shopById('missing'), undefined)
  assert.equal(shopById('night-lamp')?.area, '銅鑼灣')
})
