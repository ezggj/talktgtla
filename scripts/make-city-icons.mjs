/**
 * Original PNG marks for 我座城. Flat geometric tower, no external art.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([len, name, data, crc])
}

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y, width, height)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function inDiamond(px, py, cx, cy, hw, hh) {
  return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 1
}

function scene(x, y, w, h, pad) {
  const nx = x / w
  const ny = y / h
  const skyTop = [16, 42, 52]
  const skyMid = [232, 196, 160]
  const water = [36, 112, 122]
  let r = skyTop[0]
  let g = skyTop[1]
  let b = skyTop[2]
  const t = Math.min(1, ny / 0.72)
  r = skyTop[0] + (skyMid[0] - skyTop[0]) * t
  g = skyTop[1] + (skyMid[1] - skyTop[1]) * t
  b = skyTop[2] + (skyMid[2] - skyTop[2]) * t
  if (ny > 0.72) {
    const wave = Math.sin(nx * 28 + ny * 10) > 0.65
    r = wave ? 92 : water[0]
    g = wave ? 168 : water[1]
    b = wave ? 176 : water[2]
  }

  const cx = w * 0.5
  const cy = h * (0.62 - pad * 0.02)
  const hw = w * (0.28 - pad * 0.04)
  const hh = h * (0.14 - pad * 0.02)
  if (inDiamond(x, y, cx, cy, hw, hh)) {
    r = 230
    g = 214
    b = 176
  }

  // tower body
  const left = x < cx
  const top = cy - h * 0.34
  const foot = cy - hh * 0.15
  const half = hw * 0.42
  if (y > top && y < foot && Math.abs(x - cx) < half * (0.55 + ((foot - y) / (foot - top)) * 0.45)) {
    if (left) {
      r = 232
      g = 206
      b = 188
    } else {
      r = 196
      g = 158
      b = 140
    }
    const winCol = Math.floor((x - (cx - half)) / (half * 0.55))
    const winRow = Math.floor((y - top) / (h * 0.045))
    const inWin =
      winRow % 2 === 0 &&
      winCol % 2 === 0 &&
      (y - top) % (h * 0.045) > h * 0.012 &&
      Math.abs(x - cx) < half * 0.72
    if (inWin && y > top + h * 0.04) {
      r = 36
      g = 48
      b = 56
    }
  }
  // roof
  if (inDiamond(x, y, cx, cy - h * 0.34, hw * 0.46, hh * 0.7)) {
    r = 247
    g = 236
    b = 220
  }
  return [r, g, b, 255]
}

function write(name, w, h, pad = 0) {
  const file = join(root, 'public', name)
  writeFileSync(file, png(w, h, (x, y, width, height) => scene(x, y, width, height, pad)))
  console.log(name)
}

write('icons/favicon-32.png', 32, 32, 0)
write('icons/apple-touch-icon.png', 180, 180, 0.2)
write('icons/icon-192.png', 192, 192, 0)
write('icons/icon-512.png', 512, 512, 0)
write('icons/icon-maskable-192.png', 192, 192, 1)
write('icons/icon-maskable-512.png', 512, 512, 1)
write('og.png', 1200, 630, 0)
