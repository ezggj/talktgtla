import { TILE_H, TILE_W, screenToTile, tileCenter, tileTop, type Cam } from './iso'
import { cellKey, terrainAt } from './map'
import { hash2, mixHex } from './rng'
import { sunAmount, type Summary } from './sim'
import { DISTRICTS } from './districts'
import { PIERS, TRAM_STOPS, runningFerries, runningTramPairs } from './harbour'
import { LINE_COLOR, STATIONS, segmentPairs, type LineId } from './transit'
import type { TyphoonSignal } from './weather'
import { MAP_SIZE, type BusStop, type Cell, type Tool } from './types'
import type { Actor } from './traffic'

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
  actors: Actor[]
  ghost: Ghost | null
  raining: boolean
  builtStations: string[]
  stops: BusStop[]
  transitHints: boolean
  activeLine: LineId
  signal: TyphoonSignal
  piers: string[]
  trams: string[]
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
    const night = 1 - sun
    // Slate grade, not ink. Full night stays dim but land, roads and water keep their shapes.
    const tint = mixHex('#d5deea', '#4a5c78', Math.min(1, night * 1.05))
    wctx.save()
    wctx.globalCompositeOperation = 'multiply'
    wctx.globalAlpha = night * 0.58
    wctx.fillStyle = tint
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
  drawHarbourCraft(ctx, frame)
  drawDistrictLabels(ctx, frame)
  drawLife(ctx, frame, sun)
  if (raining) drawRain(ctx, width, height, time, sun, frame.signal)
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

function visibleTiles(cam: Cam, width: number, height: number, margin: number) {
  const corners = [
    screenToTile(-margin, -margin, cam),
    screenToTile(width + margin, -margin, cam),
    screenToTile(-margin, height + margin, cam),
    screenToTile(width + margin, height + margin, cam),
  ]
  let minC = MAP_SIZE
  let maxC = 0
  let minR = MAP_SIZE
  let maxR = 0
  for (const corner of corners) {
    minC = Math.min(minC, corner.c)
    maxC = Math.max(maxC, corner.c)
    minR = Math.min(minR, corner.r)
    maxR = Math.max(maxR, corner.r)
  }
  return {
    minC: Math.max(0, minC - 8),
    maxC: Math.min(MAP_SIZE - 1, maxC + 8),
    minR: Math.max(0, minR - 8),
    maxR: Math.min(MAP_SIZE - 1, maxR + 8),
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, frame: Frame, pass: Pass) {
  const { cam, seed, width, height } = frame
  const margin = 180
  const occupied = new Map<string, Cell>()
  for (const cell of frame.cells) occupied.set(cellKey(cell.c, cell.r), cell)

  const view = visibleTiles(cam, width, height, margin)
  for (let sum = view.minC + view.minR; sum <= view.maxC + view.maxR; sum++) {
    const c0 = Math.max(view.minC, sum - view.maxR)
    const c1 = Math.min(view.maxC, sum - view.minR)
    for (let c = c0; c <= c1; c++) {
      const r = sum - c
      const top = tileTop(c, r, cam)
      if (top.x < -margin || top.x > width + margin || top.y < -margin || top.y > height + margin) continue
      const terrain = terrainAt(c, r, seed)
      if (pass === 'solid') drawGround(ctx, c, r, cam, seed, terrain, frame.time, frame.raining)
      const cell = occupied.get(cellKey(c, r))
      if (cell) drawCell(ctx, cell, cam, seed, frame, pass)
      else if (pass === 'solid' && terrain === 'water') drawBoat(ctx, c, r, cam, seed, frame.time)
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
    const coastal =
      terrainAt(c + 1, r, seed) !== 'water' ||
      terrainAt(c - 1, r, seed) !== 'water' ||
      terrainAt(c, r + 1, seed) !== 'water' ||
      terrainAt(c, r - 1, seed) !== 'water'
    const deep = hash2(c, r, seed + 3) > 0.62
    ctx.fillStyle = coastal
      ? wave > 0 ? '#4a9aaa' : '#3d8b9a'
      : deep
        ? wave > 0.2
          ? '#1c4c58'
          : '#163f4a'
        : wave > 0.15
          ? '#2f6f7c'
          : '#265e6a'
    fillDiamond(ctx, top.x, top.y, w, h)
    if (!raining && cam.zoom > 0.35 && hash2(c, r, 17) > 0.78) {
      const glint = 0.12 + ((Math.sin(time / 520 + c + r) + 1) / 2) * 0.28
      ctx.save()
      ctx.globalAlpha = glint
      ctx.strokeStyle = '#e7f6f8'
      ctx.lineWidth = Math.max(1, cam.zoom)
      ctx.beginPath()
      ctx.moveTo(top.x - w * 0.16, top.y + h * 0.42)
      ctx.lineTo(top.x + w * 0.1, top.y + h * 0.48)
      ctx.stroke()
      ctx.restore()
    }
    return
  }

  ctx.fillStyle = groundColor(c, r, seed, terrain)
  fillDiamond(ctx, top.x, top.y, w, h)
  if (terrain === 'parkland') {
    ctx.fillStyle = 'rgba(18, 42, 16, 0.28)'
    fillDiamond(ctx, top.x + w * 0.08, top.y + h * 0.2, w * 0.62, h * 0.5)
    if ((c + r * 2) % 3 !== 0) drawTree(ctx, tileCenter(c, r, cam), cam.zoom * (0.7 + hash2(c, r, 4) * 0.6), '#2c6a3c')
  } else if (terrain === 'land' && hash2(c, r, seed + 8) > 0.93) {
    drawTree(ctx, tileCenter(c, r, cam), cam.zoom * 0.55, '#6a8f4e')
  }
  if (terrain === 'shore') {
    ctx.strokeStyle = raining ? 'rgba(255,255,255,0.45)' : 'rgba(255, 248, 230, 0.55)'
    ctx.lineWidth = Math.max(1.4, 2 * cam.zoom)
    ctx.lineCap = 'round'
    if (terrainAt(c, r + 1, seed) === 'water') {
      ctx.beginPath()
      ctx.moveTo(top.x - w / 2, top.y + h / 2)
      ctx.lineTo(top.x, top.y + h)
      ctx.stroke()
    }
    if (terrainAt(c + 1, r, seed) === 'water') {
      ctx.beginPath()
      ctx.moveTo(top.x + w / 2, top.y + h / 2)
      ctx.lineTo(top.x, top.y + h)
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
  if (pass !== 'solid') return
  if (cell.kind !== 'home' && cell.kind !== 'shop' && cell.kind !== 'factory') return
  if (frame.summary.served.has(cellKey(cell.c, cell.r))) return
  const mark = tileCenter(cell.c, cell.r, cam)
  ctx.fillStyle = '#c4483d'
  ctx.beginPath()
  ctx.arc(mark.x, mark.y - 18 * cam.zoom, Math.max(3, 3.5 * cam.zoom), 0, Math.PI * 2)
  ctx.fill()
}

function drawRoad(ctx: CanvasRenderingContext2D, cell: Cell, cam: Cam, frame: Frame, pass: Pass, sun: number) {
  const top = tileTop(cell.c, cell.r, cam)
  const w = TILE_W * cam.zoom
  const h = TILE_H * cam.zoom
  const key = cellKey(cell.c, cell.r)
  const powered = frame.summary.poweredRoads.has(key)
  if (pass === 'glow') {
    if (powered && sun < 0.72 && (cell.c + cell.r) % 3 === 0) {
      const center = tileCenter(cell.c, cell.r, cam)
      glow(ctx, center.x, center.y - 16 * cam.zoom, 34 * cam.zoom, 'rgba(255, 214, 150, 0.95)')
    }
    return
  }
  ctx.fillStyle = '#d9d0bc'
  fillDiamond(ctx, top.x, top.y, w, h)
  ctx.fillStyle = frame.raining ? '#3a424a' : '#4a525b'
  fillDiamond(ctx, top.x, top.y + h * 0.08, w * 0.78, h * 0.72)
  const here = tileCenter(cell.c, cell.r, cam)
  ctx.strokeStyle = powered ? '#f4efe4' : '#c9c2b2'
  ctx.lineWidth = Math.max(1, 1.2 * cam.zoom)
  ctx.lineCap = 'round'
  ctx.setLineDash([4 * cam.zoom, 4 * cam.zoom])
  ctx.beginPath()
  let linked = 0
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const neighbor = frame.cells.find((other) => other.kind === 'road' && other.c === cell.c + dc && other.r === cell.r + dr)
    if (!neighbor) continue
    linked += 1
    const there = tileCenter(neighbor.c, neighbor.r, cam)
    ctx.moveTo(here.x, here.y)
    ctx.lineTo((here.x + there.x) / 2, (here.y + there.y) / 2)
  }
  ctx.stroke()
  ctx.setLineDash([])
  if (linked && (cell.c + cell.r) % 4 === 0) {
    ctx.strokeStyle = 'rgba(246, 241, 231, 0.8)'
    ctx.lineWidth = Math.max(1, 1.6 * cam.zoom)
    ctx.beginPath()
    ctx.moveTo(here.x - 5 * cam.zoom, here.y - 2 * cam.zoom)
    ctx.lineTo(here.x + 5 * cam.zoom, here.y + 2 * cam.zoom)
    ctx.moveTo(here.x - 5 * cam.zoom, here.y + 1 * cam.zoom)
    ctx.lineTo(here.x + 5 * cam.zoom, here.y + 5 * cam.zoom)
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
  const variety = hash2(cell.c, cell.r, seed + 2)
  const floors = cell.stage === 1 ? 4 + (variety > 0.66 ? 1 : 0) : cell.stage === 2 ? 7 + (variety > 0.5 ? 2 : 0) : 11
  const height = floors * 11 * cam.zoom
  const wall = slab
    ? { top: '#e6e4de', left: '#d4d2cb', right: '#b7b5ae' }
    : WALLS[Math.floor(hash2(cell.c, cell.r, seed) * WALLS.length) % WALLS.length]
  if (pass === 'solid') {
    shadow(ctx, cell.c, cell.r, cam, lift)
    drawPrism(ctx, box.x, box.y, box.w, box.h, height, wall.top, wall.left, wall.right)
    paintWindows(ctx, box, height, floors, slab ? 3 : 2, cell, seed, 'solid', sun)
    if (!slab && cell.stage >= 1) drawAcAndLaundry(ctx, box, height, cell, cam.zoom)
    if (cell.stage >= 2) drawTank(ctx, box, height, cam.zoom)
    if (cell.stage >= 2) drawStreetAwning(ctx, box, height, '#c4483d')
    if (cell.stage >= 3) drawRoofClutter(ctx, box, height, cam.zoom)
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
    drawShopDoor(ctx, box, height, cam.zoom)
    if (cell.stage >= 2) drawSign(ctx, box, height, awning, cam.zoom, false)
    if (cell.stage >= 3) drawRoofClutter(ctx, box, height, cam.zoom)
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

function drawGhost(ctx: CanvasRenderingContext2D, frame: Frame) {
  const ghost = frame.ghost
  if (!ghost) return
  const top = tileTop(ghost.c, ghost.r, frame.cam)
  const w = TILE_W * frame.cam.zoom
  const h = TILE_H * frame.cam.zoom
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.fillStyle = ghost.ok ? 'rgba(240, 163, 90, 0.7)' : 'rgba(196, 60, 52, 0.72)'
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

function drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, sun: number, signal: TyphoonSignal) {
  ctx.save()
  const strong = signal >= 8
  const mid = signal >= 3
  ctx.strokeStyle = sun > 0.4 ? 'rgba(70, 90, 110, 0.28)' : 'rgba(210, 220, 235, 0.28)'
  ctx.lineWidth = strong ? 1.6 : 1
  ctx.beginPath()
  const count = Math.min(strong ? 220 : mid ? 140 : 90, Math.floor((w * h) / (strong ? 6000 : 14000)))
  const lean = strong ? 22 : mid ? 12 : 7
  for (let i = 0; i < count; i++) {
    const x = ((hash2(i, 1, 2) * w + time * (strong ? 0.55 : 0.22)) % (w + 40)) - 20
    const y = ((hash2(i, 4, 2) * h + time * (strong ? 1.1 : 0.72)) % (h + 40)) - 20
    ctx.moveTo(x, y)
    ctx.lineTo(x - lean, y + (strong ? 10 : 16))
  }
  ctx.stroke()
  const veil = strong ? 0.1 : mid ? 0.06 : 0.04
  ctx.fillStyle = `rgba(70, 96, 118, ${veil})`
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
      const color = pass === 'glow' ? '#ffe1a8' : lit && sun < 0.45 ? '#ffe1a8' : '#243038'
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

function groundColor(c: number, r: number, seed: number, terrain: 'shore' | 'land' | 'slope' | 'water' | 'parkland') {
  const n = hash2(Math.floor(c / 2), Math.floor(r / 2), seed + 9)
  const speck = hash2(c, r, seed)
  if (terrain === 'parkland') return n > 0.55 ? '#3f7a3a' : '#2f6230'
  if (terrain === 'shore') return speck > 0.5 ? '#ead7ae' : '#dcc49a'
  if (terrain === 'slope') return n > 0.5 ? '#b7a67a' : '#c8b88c'
  if (n > 0.82) return speck > 0.5 ? '#c9d4a4' : '#d5c7a4'
  return n > 0.4 ? '#e4d4b2' : '#d8c6a6'
}

function drawTree(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, leaf: string) {
  ctx.fillStyle = '#5c4030'
  ctx.fillRect(center.x - size * 0.12, center.y - size * 0.2, size * 0.24, size * 0.7)
  ctx.fillStyle = leaf
  ctx.beginPath()
  ctx.ellipse(center.x, center.y - size * 0.55, size * 0.7, size * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.ellipse(center.x - size * 0.15, center.y - size * 0.7, size * 0.32, size * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawStreetAwning(ctx: CanvasRenderingContext2D, box: Box, height: number, color: string) {
  const y = box.y + box.h * 0.78 - height * 0.05
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(box.x + box.w * 0.08, y)
  ctx.lineTo(box.x + box.w * 0.48, y + box.h * 0.28)
  ctx.lineTo(box.x + box.w * 0.48, y + box.h * 0.28 + 3)
  ctx.lineTo(box.x + box.w * 0.08, y + 3)
  ctx.closePath()
  ctx.fill()
}

function drawRoofClutter(ctx: CanvasRenderingContext2D, box: Box, height: number, zoom: number) {
  drawPrism(
    ctx,
    box.x - box.w * 0.12,
    box.y - height + box.h * 0.05,
    box.w * 0.16,
    box.h * 0.16,
    5 * zoom,
    '#c5ced4',
    '#9aa6ae',
    '#7d888f',
  )
  ctx.strokeStyle = '#8d98a1'
  ctx.lineWidth = Math.max(1, zoom)
  ctx.beginPath()
  ctx.moveTo(box.x - box.w * 0.2, box.y - height + box.h * 0.15)
  ctx.lineTo(box.x + box.w * 0.2, box.y - height + box.h * 0.35)
  ctx.stroke()
}

function drawTank(ctx: CanvasRenderingContext2D, box: Box, height: number, zoom: number) {
  drawPrism(
    ctx,
    box.x + box.w * 0.16,
    box.y - height + box.h * 0.08,
    box.w * 0.22,
    box.h * 0.22,
    7 * zoom,
    '#d7dee4',
    '#b4bec6',
    '#8d98a1',
  )
}

function drawShopDoor(ctx: CanvasRenderingContext2D, box: Box, height: number, zoom: number) {
  const door = wallPoint(box.x, box.y, box.w, box.h, height, 'right', 0.62, 0.08)
  ctx.fillStyle = '#3a342e'
  ctx.fillRect(door.x - 2.2 * zoom, door.y - 7 * zoom, 4 * zoom, 7 * zoom)
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

function drawHarbourCraft(ctx: CanvasRenderingContext2D, frame: Frame) {
  const zoom = frame.cam.zoom
  ctx.save()
  ctx.lineWidth = Math.max(1.5, 2 * zoom)
  ctx.setLineDash([6 * zoom, 5 * zoom])
  for (const route of runningFerries({ piers: frame.piers ?? [] }, frame.signal)) {
    const a = tileCenter(route.from.c, route.from.r, frame.cam)
    const b = tileCenter(route.to.c, route.to.r, frame.cam)
    ctx.strokeStyle = route.kind === 'harbour' ? '#f0a35a' : '#d7e4ea'
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.strokeStyle = '#6b4a32'
  ctx.lineWidth = Math.max(2, 2.4 * zoom)
  for (const [a, b] of runningTramPairs({ trams: frame.trams ?? [] }, frame.signal)) {
    const pa = tileCenter(a.c, a.r, frame.cam)
    const pb = tileCenter(b.c, b.r, frame.cam)
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y - 3 * zoom)
    ctx.lineTo(pb.x, pb.y - 3 * zoom)
    ctx.stroke()
  }
  const pierSet = new Set(frame.piers ?? [])
  for (const pier of PIERS) {
    const p = tileCenter(pier.c, pier.r, frame.cam)
    ctx.fillStyle = pierSet.has(pier.id) ? '#f0a35a' : 'rgba(240,163,90,0.45)'
    ctx.fillRect(p.x - 4 * zoom, p.y - 2 * zoom, 8 * zoom, 3.2 * zoom)
  }
  const tramSet = new Set(frame.trams ?? [])
  for (const stop of TRAM_STOPS) {
    const p = tileCenter(stop.c, stop.r, frame.cam)
    ctx.strokeStyle = tramSet.has(stop.id) ? '#6b4a32' : 'rgba(107,74,50,0.45)'
    ctx.strokeRect(p.x - 3 * zoom, p.y - 5 * zoom, 6 * zoom, 3 * zoom)
  }
  ctx.restore()
}

function drawDistrictLabels(ctx: CanvasRenderingContext2D, frame: Frame) {
  if (frame.cam.zoom < 0.4) return
  ctx.save()
  ctx.font = `${Math.max(13, 15 * frame.cam.zoom)}px "PingFang HK", "PingFang TC", "Noto Sans TC", sans-serif`
  ctx.textAlign = 'center'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255,248,238,0.92)'
  ctx.fillStyle = '#1c140c'
  const taken: { x: number; y: number }[] = []
  for (const station of STATIONS) {
    const p = tileCenter(station.c, station.r, frame.cam)
    taken.push(p)
  }
  for (const district of DISTRICTS) {
    const p = tileCenter(district.c, district.r, frame.cam)
    if (p.x < -40 || p.y < -20 || p.x > frame.width + 40 || p.y > frame.height + 20) continue
    if (taken.some((spot) => Math.hypot(spot.x - p.x, spot.y - p.y) < 28)) continue
    if (taken.some((spot) => Math.hypot(spot.x - p.x, spot.y - (p.y - 14 * frame.cam.zoom)) < 22)) continue
    taken.push(p)
    ctx.strokeText(district.name, p.x, p.y - 14 * frame.cam.zoom)
    ctx.fillText(district.name, p.x, p.y - 14 * frame.cam.zoom)
  }
  ctx.restore()
}

function drawLife(ctx: CanvasRenderingContext2D, frame: Frame, sun: number) {
  const { cam, summary } = frame
  const scale = Math.max(cam.zoom, 1)
  ctx.save()
  if (summary.event === 'newyear') drawShopCrowds(ctx, frame, scale)
  if (summary.event === 'autumn') drawParkLanterns(ctx, frame, scale)
  let marks = 0
  for (const cell of frame.cells) {
    if (cell.kind !== 'road' || marks > 14) continue
    const key = `${cell.c},${cell.r}`
    if (!summary.jamTiles.has(key) && !summary.closed.has(key)) continue
    const p = tileCenter(cell.c, cell.r, cam)
    if (p.x < -20 || p.y < -20 || p.x > frame.width + 20 || p.y > frame.height + 20) continue
    marks += 1
    ctx.globalAlpha = summary.closed.has(key) ? 0.85 : 0.55 + Math.sin(frame.time / 280) * 0.15
    ctx.fillStyle = summary.closed.has(key) ? '#3d6f8a' : '#c4473a'
    fillDiamond(ctx, p.x - (TILE_W * cam.zoom) / 2, p.y - TILE_H * cam.zoom, TILE_W * cam.zoom * 0.72, TILE_H * cam.zoom * 0.72)
  }
  ctx.globalAlpha = sun < 0.35 ? 0.92 : 1
  const order = [...frame.actors].sort((a, b) => a.c + a.r - (b.c + b.r))
  for (const actor of order) {
    if (actor.kind === 'person' && cam.zoom < 0.45) continue
    const a = tileCenter(actor.c, actor.r, cam)
    const b = tileCenter(actor.nc, actor.nr, cam)
    const x = a.x + (b.x - a.x) * actor.t
    const y = a.y + (b.y - a.y) * actor.t
    if (x < -40 || y < -40 || x > frame.width + 40 || y > frame.height + 40) continue
    if (actor.kind === 'person') drawPerson(ctx, x, y, scale, actor.color, frame.time)
    else if (actor.kind === 'bus') drawBus(ctx, x, y, b.x - a.x, b.y - a.y, scale, summary.jam !== 'none')
    else if (actor.kind === 'tram') drawTram(ctx, x, y, b.x - a.x, scale)
    else if (actor.kind === 'train') drawTrain(ctx, x, y, b.x - a.x, scale, actor.color)
    else drawFerry(ctx, x, y, b.x - a.x, b.y - a.y, scale, actor.color)
  }
  ctx.restore()
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, time: number) {
  const step = Math.sin(time / 90 + x) * 1.4 * s
  ctx.fillStyle = 'rgba(28, 22, 16, 0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2 * s, 3.4 * s, 1.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#3a322c'
  ctx.lineWidth = Math.max(1.4, 1.6 * s)
  ctx.beginPath()
  ctx.moveTo(x - 1.2 * s, y - 1 * s)
  ctx.lineTo(x - 2.2 * s, y + 3 * s + step)
  ctx.moveTo(x + 1.2 * s, y - 1 * s)
  ctx.lineTo(x + 2.2 * s, y + 3 * s - step)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillRect(x - 2.4 * s, y - 8 * s, 4.8 * s, 7 * s)
  ctx.fillStyle = '#f0d0b4'
  ctx.beginPath()
  ctx.arc(x, y - 9.4 * s, 2.3 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawBus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  s: number,
  stalled: boolean,
) {
  const w = 22 * s
  const h = 13 * s
  ctx.save()
  ctx.translate(x, y - 8 * s)
  if (Math.abs(dx) + Math.abs(dy) > 0.5 && dx < 0) ctx.scale(-1, 1)
  ctx.fillStyle = 'rgba(20,16,12,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, h * 0.55, w * 0.42, 2 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f6f1e6'
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h, w, h, 2 * s)
  ctx.fill()
  ctx.fillStyle = '#2a3338'
  ctx.fillRect(-w / 2 + 1.5 * s, -h + 1.4 * s, w - 5 * s, 3.2 * s)
  ctx.fillRect(-w / 2 + 1.5 * s, -h * 0.48, w - 5 * s, 2.6 * s)
  ctx.fillStyle = '#e07a32'
  ctx.fillRect(-w / 2, -h * 0.58, w, 1.5 * s)
  ctx.fillStyle = '#1c2226'
  ctx.beginPath()
  ctx.arc(-w * 0.28, -0.4 * s, 1.8 * s, 0, Math.PI * 2)
  ctx.arc(w * 0.22, -0.4 * s, 1.8 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = stalled ? '#c4473a' : '#f0a35a'
  ctx.fillRect(w / 2 - 2 * s, -h * 0.35, 2 * s, 2 * s)
  ctx.restore()
}

function drawTram(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, s: number) {
  const w = 24 * s
  ctx.save()
  ctx.translate(x, y - 6 * s)
  if (dx < 0) ctx.scale(-1, 1)
  ctx.strokeStyle = '#6b4a32'
  ctx.lineWidth = Math.max(1, s)
  ctx.beginPath()
  ctx.moveTo(-2 * s, -8 * s)
  ctx.lineTo(-2 * s, -4 * s)
  ctx.stroke()
  ctx.fillStyle = '#f7f3ea'
  ctx.beginPath()
  ctx.roundRect(-w / 2, -5.5 * s, w, 6 * s, 1.5 * s)
  ctx.fill()
  ctx.fillStyle = '#6b4a32'
  ctx.fillRect(-w / 2, -6.2 * s, w, 1.4 * s)
  ctx.fillStyle = '#243038'
  ctx.fillRect(-w / 2 + 2 * s, -4.2 * s, w - 4 * s, 2 * s)
  ctx.restore()
}

function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, s: number, color: string) {
  const w = 26 * s
  ctx.save()
  ctx.translate(x, y - 9 * s)
  if (dx < 0) ctx.scale(-1, 1)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(-w / 2, -6 * s, w, 6.4 * s, 2.2 * s)
  ctx.fill()
  ctx.fillStyle = '#f6f1e7'
  for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 2.2 * s + i * 7 * s, -4.4 * s, 4.2 * s, 2.2 * s)
  ctx.fillStyle = '#1c140c'
  ctx.fillRect(-1 * s, -6 * s, 2 * s, 6.4 * s)
  ctx.restore()
}

function drawFerry(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  s: number,
  color: string,
) {
  const len = 22 * s
  ctx.save()
  ctx.translate(x, y)
  const angle = Math.atan2(dy, dx)
  if (Math.abs(dx) + Math.abs(dy) > 0.5) ctx.rotate(angle)
  ctx.fillStyle = 'rgba(10, 20, 28, 0.25)'
  ctx.beginPath()
  ctx.ellipse(0, 3 * s, len * 0.55, 3 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(len * 0.7, 0)
  ctx.lineTo(-len * 0.48, -5.4 * s)
  ctx.lineTo(-len * 0.36, -3 * s)
  ctx.lineTo(-len * 0.36, 3 * s)
  ctx.lineTo(-len * 0.48, 5.4 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#243038'
  ctx.fillRect(-len * 0.12, -3.2 * s, 8 * s, 6.4 * s)
  ctx.fillStyle = '#f0a35a'
  ctx.fillRect(len * 0.28, -1.1 * s, 2.4 * s, 2.2 * s)
  ctx.restore()
}

function drawShopCrowds(ctx: CanvasRenderingContext2D, frame: Frame, s: number) {
  let drawn = 0
  for (const cell of frame.cells) {
    if (cell.kind !== 'shop' || drawn > 16) continue
    const p = tileCenter(cell.c, cell.r, frame.cam)
    ctx.fillStyle = drawn % 2 === 0 ? '#c4473a' : '#e6b15a'
    ctx.beginPath()
    ctx.arc(p.x, p.y - 10 * s, 2.2 * s, 0, Math.PI * 2)
    ctx.fill()
    drawn += 1
  }
}

function drawParkLanterns(ctx: CanvasRenderingContext2D, frame: Frame, s: number) {
  let drawn = 0
  for (const cell of frame.cells) {
    if (cell.kind !== 'park' || drawn > 10) continue
    const p = tileCenter(cell.c, cell.r, frame.cam)
    ctx.fillStyle = '#f0a35a'
    ctx.beginPath()
    ctx.arc(p.x, p.y - 12 * s, 3.4 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#6b4a32'
    ctx.lineWidth = Math.max(1, s)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 12 * s)
    ctx.lineTo(p.x, p.y - 4 * s)
    ctx.stroke()
    drawn += 1
  }
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
