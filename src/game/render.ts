import { TILE_H, TILE_W, tileCenter, tileTop, type Cam } from './iso'
import { cellKey, terrainAt } from './map'
import { hash2, mixHex } from './rng'
import { sunAmount, type Summary } from './sim'
import { LINE_COLOR, STATIONS, segmentPairs, type LineId } from './transit'
import { MAP_SIZE, type BusStop, type Cell, type Tool } from './types'
import type { Walker } from './walkers'

export interface Ghost {
  c: number
  r: number
  tool: Tool
  ok: boolean
}

export interface Frame {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  dpr: number
  seed: number
  day: number
  cells: Cell[]
  cam: Cam
  time: number
  summary: Summary
  walkers: Walker[]
  ghost: Ghost | null
  raining: boolean
  builtStations: string[]
  stops: BusStop[]
  transitHints: boolean
  activeLine: LineId
}

let world: HTMLCanvasElement | null = null

export function renderFrame(frame: Frame) {
  const { ctx, width, height, day, time, raining } = frame
  const sun = sunAmount(day)
  drawSky(ctx, width, height, sun, time)
  const layer = worldLayer(width, height, frame.dpr)
  const wctx = layer.getContext('2d')
  if (!wctx) return
  wctx.setTransform(frame.dpr, 0, 0, frame.dpr, 0, 0)
  wctx.clearRect(0, 0, width, height)
  drawWorld(wctx, frame, 'solid')
  drawTransit(wctx, frame, sun, false)
  if (sun < 0.98) {
    wctx.save()
    wctx.globalCompositeOperation = 'multiply'
    wctx.globalAlpha = (1 - sun) * 0.9
    wctx.fillStyle = mixHex('#ffffff', '#0a1424', 1 - sun)
    wctx.fillRect(0, 0, width, height)
    wctx.restore()
    wctx.save()
    wctx.globalCompositeOperation = 'lighter'
    drawWorld(wctx, frame, 'glow')
    drawTransit(wctx, frame, sun, true)
    wctx.restore()
  }
  ctx.drawImage(layer, 0, 0, width, height)
  drawStationLabels(ctx, frame)
  if (raining) drawRain(ctx, width, height, time, sun)
  if (frame.ghost) drawGhost(ctx, frame)
}

function worldLayer(width: number, height: number, dpr: number) {
  if (typeof document === 'undefined') throw new Error('render needs a browser')
  if (!world) world = document.createElement('canvas')
  const w = Math.max(1, Math.floor(width * dpr))
  const h = Math.max(1, Math.floor(height * dpr))
  if (world.width !== w || world.height !== h) {
    world.width = w
    world.height = h
  }
  return world
}

type Pass = 'solid' | 'glow'

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, sun: number, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, mixHex('#07101c', '#8ec8d6', sun))
  g.addColorStop(0.42, mixHex('#1a2b4a', '#f4d3ae', sun))
  g.addColorStop(1, mixHex('#163246', '#d5eee4', sun))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = sun * 0.35
  ctx.fillStyle = '#fffaf3'
  ctx.beginPath()
  ctx.ellipse(w * 0.22, h * 0.16, 70, 18, 0, 0, Math.PI * 2)
  ctx.ellipse(w * 0.3, h * 0.15, 46, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (sun < 0.55) {
    ctx.save()
    ctx.globalAlpha = 1 - sun * 1.4
    ctx.fillStyle = '#f4f0e4'
    for (let i = 0; i < 36; i++) {
      const x = hash2(i, 2, 9) * w
      const y = hash2(i, 5, 9) * h * 0.42
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1.2, i % 7 === 0 ? 2 : 1.2)
    }
    ctx.beginPath()
    ctx.arc(w * 0.8, h * 0.14, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#d5deea'
    ctx.beginPath()
    ctx.arc(w * 0.8 - 6, h * 0.14 - 2, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else {
    const pulse = 0.85 + Math.sin(time / 900) * 0.05
    ctx.save()
    ctx.globalAlpha = 0.9 * sun
    ctx.fillStyle = '#fff4d2'
    ctx.beginPath()
    ctx.arc(w * 0.78, h * 0.16, 22 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, frame: Frame, pass: Pass) {
  const { cam, seed, width, height } = frame
  const margin = 180
  const walkersAt = new Map<string, Walker[]>()
  if (pass === 'solid') {
    for (const walker of frame.walkers) {
      const c = walker.t < 0.5 ? walker.c : walker.nc
      const r = walker.t < 0.5 ? walker.r : walker.nr
      const key = cellKey(c, r)
      const list = walkersAt.get(key)
      if (list) list.push(walker)
      else walkersAt.set(key, [walker])
    }
  }
  const occupied = new Map<string, Cell>()
  for (const cell of frame.cells) occupied.set(cellKey(cell.c, cell.r), cell)

  for (let sum = 0; sum <= (MAP_SIZE - 1) * 2; sum++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      const r = sum - c
      if (r < 0 || r >= MAP_SIZE) continue
      const top = tileTop(c, r, cam)
      if (top.x < -margin || top.x > width + margin || top.y < -margin || top.y > height + margin) continue
      const terrain = terrainAt(c, r, seed)
      if (pass === 'solid') drawGround(ctx, c, r, cam, seed, terrain, frame.time, frame.raining)
      const cell = occupied.get(cellKey(c, r))
      if (cell) drawCell(ctx, cell, cam, seed, frame, pass)
      else if (pass === 'solid' && terrain === 'water') drawBoat(ctx, c, r, cam, seed, frame.time)
      if (pass === 'solid') {
        const people = walkersAt.get(cellKey(c, r))
        if (people) for (const walker of people) drawWalker(ctx, walker, cam)
      }
    }
  }
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  cam: Cam,
  seed: number,
  terrain: ReturnType<typeof terrainAt>,
  time: number,
  raining: boolean,
) {
  const top = tileTop(c, r, cam)
  const w = TILE_W * cam.zoom
  const h = TILE_H * cam.zoom
  if (terrain === 'water') {
    const wave = Math.sin(time / 680 + c * 0.65 + r * 0.4)
    const deep = hash2(c, r, seed + 3) > 0.58
    ctx.fillStyle = deep ? (wave > 0.2 ? '#2a6874' : '#1d5560') : wave > 0.15 ? '#3e8c98' : '#327c88'
    fillDiamond(ctx, top.x, top.y, w, h)
    if (wave > 0.55) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 1
      strokeDiamond(ctx, top.x, top.y + 2, w * 0.55, h * 0.55)
    }
    return
  }

  ctx.fillStyle = groundColor(c, r, seed, terrain)
  fillDiamond(ctx, top.x, top.y, w, h)
  ctx.strokeStyle = 'rgba(90, 70, 45, 0.18)'
  ctx.lineWidth = 1
  strokeDiamond(ctx, top.x, top.y, w, h)

  if (terrain === 'shore') {
    ctx.strokeStyle = raining ? 'rgba(255,255,255,0.35)' : 'rgba(120, 96, 60, 0.35)'
    ctx.lineWidth = Math.max(1, cam.zoom)
    const y = top.y
    if (terrainAt(c, r + 1, seed) === 'water') {
      ctx.beginPath()
      ctx.moveTo(top.x - w / 2, y + h / 2)
      ctx.lineTo(top.x, y + h)
      ctx.stroke()
    }
    if (terrainAt(c + 1, r, seed) === 'water') {
      ctx.beginPath()
      ctx.moveTo(top.x + w / 2, y + h / 2)
      ctx.lineTo(top.x, y + h)
      ctx.stroke()
    }
  }
}

function drawCell(ctx: CanvasRenderingContext2D, cell: Cell, cam: Cam, seed: number, frame: Frame, pass: Pass) {
  const sun = sunAmount(frame.day)
  if (cell.kind === 'road') {
    drawRoad(ctx, cell, cam, frame, pass, sun)
    return
  }
  if (cell.stage <= 0 && cell.kind !== 'power') {
    if (pass === 'solid') drawScaffold(ctx, cell.c, cell.r, cam, 0)
    return
  }
  const lift = 0
  if (cell.kind === 'home') drawHome(ctx, cell, cam, seed, pass, sun, lift)
  else if (cell.kind === 'shop') drawShop(ctx, cell, cam, seed, pass, sun, lift)
  else if (cell.kind === 'factory') drawFactory(ctx, cell, cam, seed, pass, sun, lift, frame.time, frame.summary)
  else if (cell.kind === 'park') drawPark(ctx, cell, cam, pass, lift)
  else if (cell.kind === 'power') drawPower(ctx, cell, cam, pass, sun, lift)
}

function drawRoad(ctx: CanvasRenderingContext2D, cell: Cell, cam: Cam, frame: Frame, pass: Pass, sun: number) {
  const top = tileTop(cell.c, cell.r, cam)
  const w = TILE_W * cam.zoom
  const h = TILE_H * cam.zoom
  const key = cellKey(cell.c, cell.r)
  const powered = frame.summary.poweredRoads.has(key)
  if (pass === 'glow') {
    if (powered && sun < 0.72 && (cell.c * 3 + cell.r) % 5 === 0) {
      const center = tileCenter(cell.c, cell.r, cam)
      glow(ctx, center.x, center.y - 14 * cam.zoom, 20 * cam.zoom, 'rgba(255, 206, 140, 0.85)')
    }
    return
  }
  ctx.fillStyle = frame.raining ? '#3a424a' : '#4a525b'
  fillDiamond(ctx, top.x, top.y, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  strokeDiamond(ctx, top.x, top.y, w, h)
  ctx.strokeStyle = powered ? '#f3ead4' : '#d9d0bc'
  ctx.lineWidth = Math.max(1, 1.4 * cam.zoom)
  ctx.lineCap = 'round'
  ctx.beginPath()
  const here = tileCenter(cell.c, cell.r, cam)
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const neighbor = frame.cells.find((other) => other.kind === 'road' && other.c === cell.c + dc && other.r === cell.r + dr)
    if (!neighbor) continue
    const there = tileCenter(neighbor.c, neighbor.r, cam)
    ctx.moveTo(here.x, here.y)
    ctx.lineTo((here.x + there.x) / 2, (here.y + there.y) / 2)
  }
  ctx.stroke()
  if (!hasRoadNeighbor(frame.cells, cell.c, cell.r)) {
    ctx.beginPath()
    ctx.moveTo(here.x - 4 * cam.zoom, here.y)
    ctx.lineTo(here.x + 4 * cam.zoom, here.y)
    ctx.stroke()
  }
}

function drawHome(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  cam: Cam,
  seed: number,
  pass: Pass,
  sun: number,
  lift: number,
) {
  const slab = cell.stage >= 3
  const inset = slab ? 0.06 : 0.12
  const box = footprint(cell.c, cell.r, cam, inset, lift)
  const floors = cell.stage === 1 ? 3 : cell.stage === 2 ? 5 : 7
  const height = floors * 13 * cam.zoom
  const wall = slab
    ? { top: '#e6e4de', left: '#d4d2cb', right: '#b7b5ae' }
    : WALLS[Math.floor(hash2(cell.c, cell.r, seed) * WALLS.length) % WALLS.length]
  if (pass === 'solid') {
    shadow(ctx, cell.c, cell.r, cam, lift)
    drawPrism(ctx, box.x, box.y, box.w, box.h, height, wall.top, wall.left, wall.right)
    paintWindows(ctx, box, height, floors, slab ? 3 : 2, cell, seed, 'solid', sun)
    if (!slab && cell.stage >= 1) drawAcAndLaundry(ctx, box, height, cell, cam.zoom)
    if (slab) drawPodium(ctx, box, cam.zoom)
  } else if (sun < 0.78) {
    paintWindows(ctx, box, height, floors, slab ? 3 : 2, cell, seed, 'glow', sun)
  }
}

function drawShop(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  cam: Cam,
  seed: number,
  pass: Pass,
  sun: number,
  lift: number,
) {
  const box = footprint(cell.c, cell.r, cam, 0.16, lift)
  const height = (cell.stage === 3 ? 30 : cell.stage === 2 ? 22 : 16) * cam.zoom
  const awning = AWNINGS[Math.floor(hash2(cell.c, cell.r, 4) * AWNINGS.length) % AWNINGS.length]
  if (pass === 'solid') {
    shadow(ctx, cell.c, cell.r, cam, lift)
    drawPrism(ctx, box.x, box.y, box.w, box.h, height, '#f3ece2', '#e4d5c6', '#cbb8a6')
    drawAwning(ctx, box, height, awning)
    if (cell.stage >= 2) drawSign(ctx, box, height, awning, cam.zoom, false)
    paintWindows(ctx, box, height, cell.stage >= 3 ? 2 : 1, 2, cell, seed, 'solid', sun)
  } else if (sun < 0.8) {
    const center = tileCenter(cell.c, cell.r, cam)
    glow(ctx, center.x, center.y - height * 0.35, 26 * cam.zoom, hexAlpha(awning, 0.55))
    if (cell.stage >= 2) drawSign(ctx, box, height, awning, cam.zoom, true)
    paintWindows(ctx, box, height, cell.stage >= 3 ? 2 : 1, 2, cell, seed, 'glow', sun)
  }
}

function drawFactory(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  cam: Cam,
  seed: number,
  pass: Pass,
  sun: number,
  lift: number,
  time: number,
  summary: Summary,
) {
  const box = footprint(cell.c, cell.r, cam, 0.06, lift)
  const height = (14 + cell.stage * 4) * cam.zoom
  if (pass === 'solid') {
    shadow(ctx, cell.c, cell.r, cam, lift)
    drawPrism(ctx, box.x, box.y, box.w, box.h, height, '#8d98a2', '#6e7882', '#59636c')
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    const roof = { x: box.x, y: box.y - height }
    ctx.beginPath()
    ctx.moveTo(roof.x, roof.y + 4)
    ctx.lineTo(roof.x + box.w * 0.25, roof.y + box.h * 0.25)
    ctx.moveTo(roof.x, roof.y + box.h * 0.45)
    ctx.lineTo(roof.x + box.w * 0.2, roof.y + box.h * 0.55)
    ctx.stroke()
    ctx.restore()
    if (cell.stage >= 2) {
      const stack = footprint(cell.c, cell.r, cam, 0.34, lift + height * 0.2)
      drawPrism(ctx, stack.x - box.w * 0.12, stack.y - box.h * 0.1, box.w * 0.16, box.h * 0.16, 18 * cam.zoom, '#9aa3ab', '#7d868e', '#656e76')
      const running = summary.served.has(cellKey(cell.c, cell.r))
      if (running) {
        const origin = tileTop(cell.c, cell.r, cam)
        for (let i = 0; i < 3; i++) {
          const puff = ((time / 500 + i * 0.33) % 1)
          ctx.globalAlpha = (1 - puff) * 0.35
          ctx.fillStyle = '#d5dbe0'
          ctx.beginPath()
          ctx.arc(origin.x - 6 * cam.zoom, origin.y - lift - height - 10 * cam.zoom - puff * 16 * cam.zoom, (3 + puff * 4) * cam.zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }
      drawCrate(ctx, box, cam.zoom)
    }
  } else if (sun < 0.7 && cell.stage >= 1) {
    paintWindows(ctx, box, height, 1, 3, cell, seed, 'glow', sun)
  }
}

function drawPark(ctx: CanvasRenderingContext2D, cell: Cell, cam: Cam, pass: Pass, lift: number) {
  if (pass === 'glow') return
  const top = tileTop(cell.c, cell.r, cam)
  const w = TILE_W * cam.zoom
  const h = TILE_H * cam.zoom
  ctx.fillStyle = '#7ea56a'
  fillDiamond(ctx, top.x, top.y - lift, w, h)
  ctx.fillStyle = '#c8b48a'
  fillDiamond(ctx, top.x, top.y - lift + h * 0.18, w * 0.45, h * 0.45)
  const center = tileCenter(cell.c, cell.r, cam)
  const groundY = center.y - lift
  if (cell.stage >= 1) {
    drawPrism(ctx, center.x - 8 * cam.zoom, groundY - 2 * cam.zoom, 14 * cam.zoom, 7 * cam.zoom, 3 * cam.zoom, '#a87848', '#8d6238', '#6e4c2c')
  }
  if (cell.stage >= 2) {
    ctx.fillStyle = '#d8c7a4'
    ctx.beginPath()
    ctx.ellipse(center.x + 8 * cam.zoom, groundY, 5 * cam.zoom, 2.6 * cam.zoom, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8d6a45'
    ctx.beginPath()
    ctx.ellipse(center.x + 8 * cam.zoom, groundY, 1.3 * cam.zoom, 2.2 * cam.zoom, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const canopy = (8 + cell.stage * 4) * cam.zoom
  ctx.fillStyle = '#6b4632'
  ctx.fillRect(center.x - 1.4 * cam.zoom, groundY - canopy * 0.85, 2.8 * cam.zoom, canopy * 0.85)
  ctx.fillStyle = cell.stage >= 3 ? '#2f6d46' : '#3c7d52'
  ctx.beginPath()
  ctx.ellipse(center.x, groundY - canopy, canopy * 0.95, canopy * 0.52, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4e9464'
  ctx.beginPath()
  ctx.ellipse(center.x - canopy * 0.2, groundY - canopy - 2 * cam.zoom, canopy * 0.62, canopy * 0.36, 0, 0, Math.PI * 2)
  ctx.fill()
  if (cell.stage >= 2) {
    ctx.strokeStyle = '#6b4632'
    ctx.lineWidth = Math.max(1, cam.zoom)
    ctx.beginPath()
    ctx.moveTo(center.x - 2 * cam.zoom, groundY - canopy * 0.7)
    ctx.lineTo(center.x - 2 * cam.zoom, groundY - 2 * cam.zoom)
    ctx.moveTo(center.x + 3 * cam.zoom, groundY - canopy * 0.55)
    ctx.lineTo(center.x + 4 * cam.zoom, groundY - 1 * cam.zoom)
    ctx.stroke()
  }
}

function drawPower(ctx: CanvasRenderingContext2D, cell: Cell, cam: Cam, pass: Pass, sun: number, lift: number) {
  const box = footprint(cell.c, cell.r, cam, 0.3, lift)
  const height = 16 * cam.zoom
  if (pass === 'solid') {
    shadow(ctx, cell.c, cell.r, cam, lift)
    drawPrism(ctx, box.x, box.y, box.w, box.h, height, '#d5d8dc', '#b7bcc2', '#8e959c')
    ctx.fillStyle = '#e0b23a'
    const band = wallPoint(box.x, box.y, box.w, box.h, height, 'right', 0.15, 0.42)
    const band2 = wallPoint(box.x, box.y, box.w, box.h, height, 'right', 0.85, 0.42)
    const band3 = wallPoint(box.x, box.y, box.w, box.h, height, 'right', 0.85, 0.58)
    const band4 = wallPoint(box.x, box.y, box.w, box.h, height, 'right', 0.15, 0.58)
    ctx.beginPath()
    ctx.moveTo(band.x, band.y)
    ctx.lineTo(band2.x, band2.y)
    ctx.lineTo(band3.x, band3.y)
    ctx.lineTo(band4.x, band4.y)
    ctx.closePath()
    ctx.fill()
  } else if (sun < 0.75) {
    const center = tileCenter(cell.c, cell.r, cam)
    glow(ctx, center.x, center.y - lift - height - 2, 10 * cam.zoom, 'rgba(255, 196, 90, 0.8)')
  }
}

function drawScaffold(ctx: CanvasRenderingContext2D, c: number, r: number, cam: Cam, lift: number) {
  const box = footprint(c, r, cam, 0.18, lift)
  ctx.strokeStyle = '#d7b34a'
  ctx.lineWidth = Math.max(1, cam.zoom)
  const height = 18 * cam.zoom
  ctx.beginPath()
  for (const [px, py] of [
    [box.x, box.y],
    [box.x + box.w / 2, box.y + box.h / 2],
    [box.x, box.y + box.h],
    [box.x - box.w / 2, box.y + box.h / 2],
  ] as const) {
    ctx.moveTo(px, py)
    ctx.lineTo(px, py - height)
  }
  ctx.moveTo(box.x - box.w / 2, box.y + box.h / 2 - height)
  ctx.lineTo(box.x, box.y - height)
  ctx.lineTo(box.x + box.w / 2, box.y + box.h / 2 - height)
  ctx.lineTo(box.x, box.y + box.h - height)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = 'rgba(232, 224, 208, 0.9)'
  fillDiamond(ctx, box.x, box.y - 4 * cam.zoom, box.w * 0.9, box.h * 0.9)
}

function drawBoat(ctx: CanvasRenderingContext2D, c: number, r: number, cam: Cam, seed: number, time: number) {
  if (hash2(c, r, seed + 11) < 0.975) return
  if (terrainAt(c + 1, r, seed) !== 'water' || terrainAt(c, r + 1, seed) !== 'water') return
  const center = tileCenter(c, r, cam)
  const bob = Math.sin(time / 450 + c) * 2 * cam.zoom
  const x = center.x
  const y = center.y + bob
  ctx.fillStyle = '#f4efe6'
  ctx.beginPath()
  ctx.moveTo(x - 10 * cam.zoom, y)
  ctx.lineTo(x + 10 * cam.zoom, y)
  ctx.lineTo(x + 7 * cam.zoom, y + 4 * cam.zoom)
  ctx.lineTo(x - 7 * cam.zoom, y + 4 * cam.zoom)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#c4554a'
  ctx.lineWidth = Math.max(1, cam.zoom)
  ctx.beginPath()
  ctx.moveTo(x - 6 * cam.zoom, y + 1.5 * cam.zoom)
  ctx.lineTo(x + 6 * cam.zoom, y + 1.5 * cam.zoom)
  ctx.stroke()
  ctx.strokeStyle = '#efe6d4'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 8 * cam.zoom)
  ctx.stroke()
}

function drawWalker(ctx: CanvasRenderingContext2D, walker: Walker, cam: Cam) {
  const a = tileCenter(walker.c, walker.r, cam)
  const b = tileCenter(walker.nc, walker.nr, cam)
  const x = a.x + (b.x - a.x) * walker.t
  const y = a.y + (b.y - a.y) * walker.t - 2 * cam.zoom
  if (walker.kind === 'van') {
    const w = 16 * cam.zoom
    const h = 8 * cam.zoom
    drawPrism(ctx, x, y - h, w, h, 6 * cam.zoom, '#f7f3ea', '#ece4d6', '#ddd2c2')
    ctx.fillStyle = '#c4473a'
    const p1 = wallPoint(x, y - h, w, h, 6 * cam.zoom, 'right', 0.1, 0.35)
    const p2 = wallPoint(x, y - h, w, h, 6 * cam.zoom, 'right', 0.9, 0.35)
    const p3 = wallPoint(x, y - h, w, h, 6 * cam.zoom, 'right', 0.9, 0.55)
    const p4 = wallPoint(x, y - h, w, h, 6 * cam.zoom, 'right', 0.1, 0.55)
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.closePath()
    ctx.fill()
    return
  }
  ctx.fillStyle = 'rgba(40, 30, 20, 0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2 * cam.zoom, 3 * cam.zoom, 1.5 * cam.zoom, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = walker.shirt
  ctx.fillRect(x - 1.7 * cam.zoom, y - 5 * cam.zoom, 3.4 * cam.zoom, 5 * cam.zoom)
  ctx.fillStyle = '#f0d0b4'
  ctx.beginPath()
  ctx.arc(x, y - 6.4 * cam.zoom, 1.7 * cam.zoom, 0, Math.PI * 2)
  ctx.fill()
}

function drawGhost(ctx: CanvasRenderingContext2D, frame: Frame) {
  const ghost = frame.ghost
  if (!ghost) return
  const top = tileTop(ghost.c, ghost.r, frame.cam)
  const w = TILE_W * frame.cam.zoom
  const h = TILE_H * frame.cam.zoom
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = ghost.ok ? 'rgba(240, 163, 90, 0.55)' : 'rgba(196, 72, 64, 0.45)'
  fillDiamond(ctx, top.x, top.y, w, h)
  if (ghost.tool === 'bulldoze') {
    ctx.strokeStyle = '#f2d2cc'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(top.x - 8, top.y + h / 2 - 6)
    ctx.lineTo(top.x + 8, top.y + h / 2 + 6)
    ctx.moveTo(top.x + 8, top.y + h / 2 - 6)
    ctx.lineTo(top.x - 8, top.y + h / 2 + 6)
    ctx.stroke()
  }
  ctx.restore()
}

function drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, sun: number) {
  ctx.save()
  ctx.strokeStyle = sun > 0.4 ? 'rgba(70, 90, 110, 0.28)' : 'rgba(210, 220, 235, 0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const count = Math.min(90, Math.floor((w * h) / 14000))
  for (let i = 0; i < count; i++) {
    const x = ((hash2(i, 1, 2) * w + time * 0.22) % (w + 30)) - 15
    const y = ((hash2(i, 4, 2) * h + time * 0.72) % (h + 30)) - 15
    ctx.moveTo(x, y)
    ctx.lineTo(x - 7, y + 16)
  }
  ctx.stroke()
  ctx.fillStyle = 'rgba(80, 110, 130, 0.05)'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function paintWindows(
  ctx: CanvasRenderingContext2D,
  box: Box,
  height: number,
  floors: number,
  cols: number,
  cell: Cell,
  seed: number,
  pass: Pass,
  sun: number,
) {
  for (let floor = 0; floor < floors; floor++) {
    for (let col = 0; col < cols; col++) {
      const lit = hash2(cell.c * 5 + floor, cell.r * 3 + col, seed + 1) > 0.42
      if (pass === 'glow' && (!lit || sun > 0.78)) continue
      const color = pass === 'glow' ? '#ffd18a' : lit && sun < 0.35 ? '#ffd18a' : '#243038'
      const u = 0.14 + (col / cols) * 0.72
      const v = 0.14 + (floor / floors) * 0.74
      const uw = 0.16 / Math.max(1, cols / 2)
      const vh = 0.34 / floors
      for (const side of ['left', 'right'] as const) {
        drawWindow(ctx, box, height, side, u, v, uw, vh, color)
      }
    }
  }
}

function drawAcAndLaundry(ctx: CanvasRenderingContext2D, box: Box, height: number, cell: Cell, zoom: number) {
  const floor = hash2(cell.c, cell.r, 6) > 0.5 ? 0.55 : 0.3
  const p = wallPoint(box.x, box.y, box.w, box.h, height, 'left', 0.72, floor)
  ctx.fillStyle = '#d5dbe0'
  ctx.fillRect(p.x - 3 * zoom, p.y - 2 * zoom, 4.5 * zoom, 3 * zoom)
  if (cell.stage < 2) return
  const peg = wallPoint(box.x, box.y, box.w, box.h, height, 'left', 0.22, 0.62)
  ctx.lineWidth = Math.max(1, zoom)
  const colors = ['#f4f1ea', '#d4566a', '#3d8ea0']
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = colors[i]
    ctx.beginPath()
    ctx.moveTo(peg.x, peg.y + i * 2 * zoom)
    ctx.lineTo(peg.x - 6 * zoom, peg.y + (i + 1) * 2 * zoom)
    ctx.stroke()
  }
}

function drawPodium(ctx: CanvasRenderingContext2D, box: Box, zoom: number) {
  ctx.fillStyle = '#c8c2b4'
  fillDiamond(ctx, box.x, box.y + box.h * 0.08, box.w * 1.05, box.h * 0.28)
  void zoom
}

function drawAwning(ctx: CanvasRenderingContext2D, box: Box, height: number, color: string) {
  const y = box.y + box.h * 0.72 - height * 0.15
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(box.x, y)
  ctx.lineTo(box.x + box.w / 2, y + box.h / 2)
  ctx.lineTo(box.x + box.w / 2, y + box.h / 2 + 4)
  ctx.lineTo(box.x, y + 4)
  ctx.closePath()
  ctx.fill()
}

function drawSign(ctx: CanvasRenderingContext2D, box: Box, height: number, color: string, zoom: number, glowPass: boolean) {
  const x = box.x + box.w * 0.22
  const y = box.y - height - 12 * zoom
  ctx.fillStyle = glowPass ? color : '#2a3036'
  ctx.fillRect(x, y, 5 * zoom, 14 * zoom)
  if (!glowPass) {
    ctx.fillStyle = color
    ctx.fillRect(x + 0.8 * zoom, y + 2 * zoom, 3.2 * zoom, 4 * zoom)
    ctx.fillRect(x + 0.8 * zoom, y + 8 * zoom, 3.2 * zoom, 3 * zoom)
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, box: Box, zoom: number) {
  drawPrism(ctx, box.x + box.w * 0.28, box.y + box.h * 0.55, 8 * zoom, 4 * zoom, 5 * zoom, '#c99562', '#a87445', '#8a5c34')
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  box: Box,
  height: number,
  side: 'left' | 'right',
  u: number,
  v: number,
  uw: number,
  vh: number,
  color: string,
) {
  const p00 = wallPoint(box.x, box.y, box.w, box.h, height, side, u, v)
  const p10 = wallPoint(box.x, box.y, box.w, box.h, height, side, u + uw, v)
  const p11 = wallPoint(box.x, box.y, box.w, box.h, height, side, u + uw, v + vh)
  const p01 = wallPoint(box.x, box.y, box.w, box.h, height, side, u, v + vh)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(p00.x, p00.y)
  ctx.lineTo(p10.x, p10.y)
  ctx.lineTo(p11.x, p11.y)
  ctx.lineTo(p01.x, p01.y)
  ctx.closePath()
  ctx.fill()
}

function wallPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  side: 'left' | 'right',
  u: number,
  v: number,
) {
  const outerX = side === 'left' ? x - w / 2 : x + w / 2
  const outerY = y + h / 2
  const gx = outerX + (x - outerX) * u
  const gy = outerY + (y + h - outerY) * u
  return { x: gx, y: gy - height * v }
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function footprint(c: number, r: number, cam: Cam, inset: number, lift: number): Box {
  const top = tileTop(c, r, cam)
  const tw = TILE_W * cam.zoom
  const th = TILE_H * cam.zoom
  const w = tw * (1 - inset * 2)
  const h = th * (1 - inset * 2)
  const cx = top.x
  const cy = top.y + th / 2 - lift
  return { x: cx, y: cy - h / 2, w, h }
}

function drawPrism(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  top: string,
  left: string,
  right: string,
) {
  ctx.fillStyle = left
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y + h / 2)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + h - height)
  ctx.lineTo(x - w / 2, y + h / 2 - height)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = right
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h / 2)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + h - height)
  ctx.lineTo(x + w / 2, y + h / 2 - height)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = top
  fillDiamond(ctx, x, y - height, w, h)
}

function fillDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  diamond(ctx, x, y, w, h)
  ctx.fill()
}

function strokeDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  diamond(ctx, x, y, w, h)
  ctx.stroke()
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w / 2, y + h / 2)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x - w / 2, y + h / 2)
  ctx.closePath()
}

function shadow(ctx: CanvasRenderingContext2D, c: number, r: number, cam: Cam, lift: number) {
  const center = tileCenter(c, r, cam)
  ctx.fillStyle = 'rgba(50, 40, 30, 0.2)'
  ctx.beginPath()
  ctx.ellipse(center.x, center.y - lift + 2, 16 * cam.zoom, 7 * cam.zoom, 0, 0, Math.PI * 2)
  ctx.fill()
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function groundColor(c: number, r: number, seed: number, terrain: 'shore' | 'land' | 'slope' | 'water') {
  const n = hash2(c, r, seed)
  if (terrain === 'shore') return n > 0.5 ? '#e7d3aa' : '#dcc7a0'
  if (terrain === 'slope') return n > 0.5 ? '#c6b88a' : '#d2c29a'
  if (n > 0.92) return '#c5d09a'
  return n > 0.45 ? '#e0d0ae' : '#d4c4a0'
}

function hasRoadNeighbor(cells: Cell[], c: number, r: number) {
  return cells.some(
    (other) =>
      other.kind === 'road' &&
      ((other.c === c + 1 && other.r === r) ||
        (other.c === c - 1 && other.r === r) ||
        (other.c === c && other.r === r + 1) ||
        (other.c === c && other.r === r - 1)),
  )
}

function hexAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const WALLS = [
  { top: '#f6e7da', left: '#e4cfc0', right: '#c9aa9a' },
  { top: '#e7f1eb', left: '#d3e3da', right: '#b4c9be' },
  { top: '#f8ecd4', left: '#e7d4b6', right: '#cbb892' },
  { top: '#f6e6e4', left: '#e4d0ce', right: '#c9b0ad' },
  { top: '#eee8de', left: '#ddd4c6', right: '#c2b6a4' },
]

const AWNINGS = ['#c4483d', '#e07a32', '#2c7c86', '#b8436c']

function drawTransit(ctx: CanvasRenderingContext2D, frame: Frame, sun: number, glow: boolean) {
  const builtIds = frame.builtStations ?? []
  const built = new Set(builtIds)
  const zoom = frame.cam.zoom
  if (!glow) {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(3, 4 * zoom)
    for (const line of ['island', 'tsuen', 'kwun', 'east', 'tung'] as const) {
      ctx.strokeStyle = LINE_COLOR[line]
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      for (const [a, b] of segmentPairs(builtIds, line)) {
        const pa = tileCenter(a.c, a.r, frame.cam)
        const pb = tileCenter(b.c, b.r, frame.cam)
        ctx.moveTo(pa.x, pa.y - 6 * zoom)
        ctx.lineTo(pb.x, pb.y - 6 * zoom)
      }
      ctx.stroke()
    }
    ctx.restore()
    for (const stop of frame.stops ?? []) {
      const p = tileCenter(stop.c, stop.r, frame.cam)
      ctx.fillStyle = '#f4efe4'
      ctx.fillRect(p.x - 1.2 * zoom, p.y - 10 * zoom, 2.2 * zoom, 10 * zoom)
      ctx.fillStyle = '#c4473a'
      ctx.beginPath()
      ctx.arc(p.x, p.y - 11 * zoom, 2.4 * zoom, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (const station of STATIONS) {
    const on = built.has(station.id)
    const hinted = frame.transitHints && station.lines.includes(frame.activeLine)
    const p = tileCenter(station.c, station.r, frame.cam)
    const color = LINE_COLOR[station.lines[0]]
    if (glow) {
      if (!on || sun > 0.72) continue
      glowDot(ctx, p.x, p.y - 8 * zoom, 10 * zoom, color)
      continue
    }
    const radius = Math.max(on || hinted ? 4.5 : 2.6, (on ? 5.2 : 3.4) * zoom)
    ctx.beginPath()
    ctx.arc(p.x, p.y - 7 * zoom, radius, 0, Math.PI * 2)
    ctx.fillStyle = on ? color : 'rgba(246,241,231,0.2)'
    ctx.fill()
    ctx.lineWidth = Math.max(1, zoom)
    ctx.strokeStyle = color
    ctx.stroke()
  }
  if (!glow && builtIds.length >= 2) {
    const line = frame.activeLine
    const pairs = segmentPairs(builtIds, line)
    if (pairs.length) {
      const [a, b] = pairs[Math.floor(frame.time / 1400) % pairs.length]
      const t = (frame.time % 1400) / 1400
      const pa = tileCenter(a.c, a.r, frame.cam)
      const pb = tileCenter(b.c, b.r, frame.cam)
      const x = pa.x + (pb.x - pa.x) * t
      const y = pa.y + (pb.y - pa.y) * t - 8 * zoom
      ctx.fillStyle = '#f7f3ea'
      ctx.fillRect(x - 4 * zoom, y - 2.5 * zoom, 8 * zoom, 4 * zoom)
    }
  }
}

function drawStationLabels(ctx: CanvasRenderingContext2D, frame: Frame) {
  if (frame.cam.zoom <= 0.28) return
  const built = new Set(frame.builtStations ?? [])
  ctx.save()
  ctx.font = `${Math.max(12, 13 * frame.cam.zoom)}px "PingFang HK", "PingFang TC", "Noto Sans TC", sans-serif`
  ctx.fillStyle = '#1c140c'
  ctx.strokeStyle = '#fff8ee'
  ctx.lineWidth = 4
  for (const station of STATIONS) {
    const on = built.has(station.id)
    const hinted = frame.transitHints && station.lines.includes(frame.activeLine)
    if (!on && !hinted && frame.cam.zoom < 0.5) continue
    const p = tileCenter(station.c, station.r, frame.cam)
    const x = p.x + 6 * frame.cam.zoom
    const y = p.y - 6 * frame.cam.zoom
    ctx.strokeText(station.name, x, y)
    ctx.fillText(station.name, x, y)
  }
  ctx.restore()
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
