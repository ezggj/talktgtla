import assert from 'node:assert/strict'
import test from 'node:test'
import { screenToTile, tileCenter } from './iso'

test('tile center hits the same tile', () => {
  const cam = { x: 420, y: 180, zoom: 1 }
  for (const [c, r] of [
    [0, 0],
    [3, 5],
    [15, 15],
    [31, 2],
    [2, 31],
  ] as const) {
    const point = tileCenter(c, r, cam)
    const hit = screenToTile(point.x, point.y, cam)
    assert.equal(hit.c, c)
    assert.equal(hit.r, r)
  }
})

test('zoom keeps the tile under the cursor', () => {
  const cam = { x: 300, y: 220, zoom: 0.8 }
  const point = tileCenter(10, 12, cam)
  const hit = screenToTile(point.x, point.y, cam)
  assert.equal(hit.c, 10)
  assert.equal(hit.r, 12)
})
