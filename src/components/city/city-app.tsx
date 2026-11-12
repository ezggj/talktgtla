'use client'

import { useEffect, useRef, useState } from 'react'
import { TOOLS, demandLine, formatMoney, formatSigned } from '@/game/copy'
import { createDemo } from '@/game/demo'
import { clampZoom, screenToTile, type Cam } from '@/game/iso'
import { frameLand, framePlay, terrainAt } from '@/game/map'
import { renderFrame, type Ghost } from '@/game/render'
import { clearSave, readSave, writeSave } from '@/game/save'
import {
  coach,
  dayNumber,
  dayPart,
  isRaining,
  newGame,
  place,
  reasonCopy,
  summarize,
  takeMilestones,
  tick,
  tileHint,
  type Summary,
} from '@/game/sim'
import { PIER_COST, TRAM_COST, buildPier, buildTram, nearestPier, nearestTram } from '@/game/harbour'
import { typhoonSignal } from '@/game/weather'
import {
  LINE_COLOR,
  LINES,
  STATION_COST,
  STOP_COST,
  STATIONS,
  buildStation,
  buildStop,
  nearestUnbuilt,
  type LineId,
} from '@/game/transit'
import { cityNickname, goalTool, nextGoal, snapOf, todayStory, tomorrowLine } from '@/game/keep'
import { cityLabel, paintShareCard, shareCaption } from '@/game/share'
import { stepTraffic, syncTraffic, type Actor } from '@/game/traffic'
import { COST, MAP_SIZE, isBuildKind, type GameState, type Tool } from '@/game/types'
import './city.css'

interface Hud {
  when: string
  money: string
  delta: string
  deltaUp: boolean
  pop: string
  jobs: string
  coach: string
  nick: string
  story: string
  tease: string | null
  rain: boolean
  paused: boolean
  fast: boolean
  demands: string[]
  roads: number
  goalId: string
}

const EMPTY_HUD: Hud = {
  when: '第1日 · 日頭',
  money: formatMoney(6000),
  delta: '',
  deltaUp: true,
  pop: '0',
  jobs: '0',
  coach: '撳「路」，再撳塊地起。',
  nick: '',
  story: '',
  tease: null,
  rain: false,
  paused: false,
  fast: false,
  demands: ['住宅 想多啲', '街舖 夠', '工業 夠'],
  roads: 0,
  goalId: 'tram',
}

export function CityApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<'title' | 'play'>('title')
  const toolRef = useRef<Tool>('road')
  const lineRef = useRef<LineId>('island')
  const paintRef = useRef(false)
  const stateRef = useRef<GameState | null>(null)
  const demoRef = useRef<GameState | null>(null)
  const summaryRef = useRef<Summary | null>(null)
  const camRef = useRef<Cam | null>(null)
  const viewRef = useRef({ w: 0, h: 0, dpr: 1 })
  const ghostRef = useRef<Ghost | null>(null)
  const playActors = useRef<Actor[]>([])
  const demoActors = useRef<Actor[]>([])
  const userMoved = useRef(false)
  const toastLock = useRef('')
  const hudNow = useRef(false)
  const hintRef = useRef<string | null>(null)
  const goalSeen = useRef<string | null>(null)
  const goalText = useRef('')

  const [mode, setMode] = useState<'title' | 'play'>('title')
  const [ready, setReady] = useState(false)
  const [hasSave, setHasSave] = useState(false)
  const [tool, setTool] = useState<Tool>('road')
  const [line, setLine] = useState<LineId>('island')
  const [paint, setPaint] = useState(false)
  const [hud, setHud] = useState<Hud>(EMPTY_HUD)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [moreTools, setMoreTools] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [cityName, setCityName] = useState('我座城')
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const apply = () => setNarrow(window.innerWidth < 720)
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  useEffect(() => {
    if (!shareOpen || !shareUrl || !previewRef.current) return
    const preview = previewRef.current
    const image = new Image()
    image.onload = () => {
      const ctx = preview.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, preview.width, preview.height)
      ctx.drawImage(image, 0, 0, preview.width, preview.height)
    }
    image.src = shareUrl
  }, [shareOpen, shareUrl])

  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  useEffect(() => {
    lineRef.current = line
  }, [line])

  useEffect(() => {
    paintRef.current = paint
  }, [paint])

  useEffect(() => {
    const demo = createDemo()
    demoRef.current = demo
    summaryRef.current = summarize(demo)
    const readyTimer = window.setTimeout(() => {
      setHasSave(Boolean(readSave()))
      setReady(true)
    }, 0)
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return () => window.clearTimeout(readyTimer)

    const pointers = new Map<number, { x: number; y: number; ox: number; oy: number; moved: boolean }>()
    let painting = false
    let pinched = false
    let lastPaint = ''
    let panOrigin: { x: number; y: number; camX: number; camY: number } | null = null
    let pinch: { d: number; midX: number; midY: number } | null = null
    let last = performance.now()
    let hudClock = 0
    let saveClock = 0
    let raf = 0

    const pointOf = (event: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const showToast = (message: string) => {
      if (toastLock.current === message) return
      toastLock.current = message
      setToast(message)
      window.setTimeout(() => {
        setToast((current) => (current === message ? null : current))
        if (toastLock.current === message) toastLock.current = ''
      }, 1600)
    }

    const publish = () => {
      const playing = modeRef.current === 'play'
      const state = playing ? stateRef.current : null
      const summary = playing && state ? summarize(state) : summaryRef.current
      if (playing && state) summaryRef.current = summary
      if (!state || !summary) return
      const flow = Math.floor(state.day) >= 1 ? state.lastDelta : summary.income - summary.upkeep
      const snap = snapOf(summary)
      const goal = nextGoal(state, snap)
      let finished: string | null = null
      if (goalSeen.current && goalSeen.current !== goal.id) finished = goalText.current
      goalSeen.current = goal.id
      goalText.current = goal.text
      if (finished) showToast(`做到：${finished}`)
      const part = dayPart(state.day)
      const tease = state.paused || part === '夜晚' || part === '凌晨' ? tomorrowLine(state.day, state.seed, snap.ferries >= 1 || snap.mtrLinked >= 2) : null
      setHud({
        when: `第${dayNumber(state.day)}日 · ${part}${typhoonLabel(typhoonSignal(state.day, state.seed))}`,
        money: formatMoney(state.money),
        delta: formatSigned(flow),
        deltaUp: flow >= 0,
        pop: summary.pop.toLocaleString('en-HK'),
        jobs: summary.jobs.toLocaleString('en-HK'),
        coach: hintRef.current || coach(state, summary),
        nick: cityNickname(state, snap),
        story: todayStory(snap, finished),
        tease,
        goalId: goal.id,
        rain: isRaining(state.day, state.seed),
        paused: state.paused,
        fast: state.speed === 3,
        demands: [
          demandLine('home', summary.demand.home),
          demandLine('shop', summary.demand.shop),
          demandLine('factory', summary.demand.factory),
        ],
        roads: summary.counts.road,
      })
      const notes = takeMilestones(state, summary)
      if (notes[0]) showToast(notes[0])
    }

    const persist = () => {
      const state = stateRef.current
      const cam = camRef.current
      if (modeRef.current !== 'play' || !state || !cam) return
      if (!writeSave(state, cam)) showToast('呢部機記唔到。')
      else setHasSave(true)
    }

    const ensureCam = () => {
      if (camRef.current || !viewRef.current.w) return
      const view = viewRef.current
      camRef.current = frameLand(view.w, view.h)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      viewRef.current = { w: rect.width, h: rect.height, dpr }
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ensureCam()
    }

    const zoomAt = (sx: number, sy: number, next: number) => {
      const cam = camRef.current
      if (!cam) return
      const zoom = clampZoom(next)
      const wx = (sx - cam.x) / cam.zoom
      const wy = (sy - cam.y) / cam.zoom
      camRef.current = { zoom, x: sx - wx * zoom, y: sy - wy * zoom }
      userMoved.current = true
    }

    const ghostAt = (x: number, y: number) => {
      const cam = camRef.current
      const state = stateRef.current
      if (!cam || !state || modeRef.current !== 'play') {
        ghostRef.current = null
        return
      }
      const tile = screenToTile(x, y, cam)
      const occupied = state.cells.some((cell) => cell.c === tile.c && cell.r === tile.r)
      const toolNow = toolRef.current
      const inside = tile.c >= 0 && tile.r >= 0 && tile.c < MAP_SIZE && tile.r < MAP_SIZE
      const ground = inside ? terrainAt(tile.c, tile.r, state.seed) : 'water'
      const water = ground === 'water'
      const hill = ground === 'parkland' || ground === 'slope'
      const besideRoad = [-1, 1].some((d) => {
        return (
          state.cells.some((cell) => cell.kind === 'road' && cell.c === tile.c + d && cell.r === tile.r) ||
          state.cells.some((cell) => cell.kind === 'road' && cell.c === tile.c && cell.r === tile.r + d)
        )
      })
      let ok = true
      if (!inside) ok = false
      else if (toolNow === 'mtr') ok = nearestUnbuilt(lineRef.current, tile.c, tile.r, state.stations) !== null && state.money >= STATION_COST
      else if (toolNow === 'ferry') ok = nearestPier(tile.c, tile.r, state.piers ?? []) !== null && state.money >= PIER_COST
      else if (toolNow === 'tram') ok = nearestTram(tile.c, tile.r, state.trams ?? []) !== null && state.money >= TRAM_COST
      else if (toolNow === 'bus') {
        ok = state.cells.some((cell) => cell.kind === 'road' && cell.c === tile.c && cell.r === tile.r) && state.money >= STOP_COST
      } else if (toolNow === 'bulldoze') ok = occupied
      else if (water || hill || occupied || !isBuildKind(toolNow) || state.money < COST[toolNow]) ok = false
      else if (toolNow !== 'road' && !besideRoad) ok = false
      ghostRef.current = { c: tile.c, r: tile.r, tool: toolNow, ok }
      hintRef.current = tileHint(state, summaryRef.current ?? summarize(state), tile.c, tile.r, toolNow)
    }

    const actAt = (x: number, y: number, quiet = false) => {
      const cam = camRef.current
      const state = stateRef.current
      if (!cam || !state || modeRef.current !== 'play') return
      const tile = screenToTile(x, y, cam)
      const key = `${tile.c},${tile.r}`
      if (key === lastPaint) return
      lastPaint = key
      const toolNow = toolRef.current
      if (toolNow === 'mtr') {
        const station = nearestUnbuilt(lineRef.current, tile.c, tile.r, state.stations)
        if (!station) {
          if (!quiet) showToast('撳光點先起站。')
          return
        }
        const built = buildStation(state, station.id)
        if (built === 'money') showToast('庫房唔夠。')
        else if (built === 'have' && !quiet) showToast('呢個站起咗。')
        else if (built === 'ok') {
          state.guide = false
          navigator.vibrate?.(10)
          summaryRef.current = summarize(state)
          publish()
          persist()
        }
        return
      }
      if (toolNow === 'ferry') {
        const pier = nearestPier(tile.c, tile.r, state.piers ?? [])
        if (!pier) {
          if (!quiet) showToast('撳碼頭光點先開船。')
          return
        }
        const built = buildPier(state, pier.id)
        if (built === 'money') showToast('庫房唔夠。')
        else if (built === 'have' && !quiet) showToast('呢個碼頭開咗。')
        else if (built === 'ok') {
          state.guide = false
          navigator.vibrate?.(10)
          summaryRef.current = summarize(state)
          publish()
          persist()
        }
        return
      }
      if (toolNow === 'tram') {
        const stop = nearestTram(tile.c, tile.r, state.trams ?? [])
        if (!stop) {
          if (!quiet) showToast('撳電車站先鋪軌。')
          return
        }
        const built = buildTram(state, stop.id)
        if (built === 'money') showToast('庫房唔夠。')
        else if (built === 'have' && !quiet) showToast('呢個站起咗。')
        else if (built === 'ok') {
          state.guide = false
          navigator.vibrate?.(10)
          summaryRef.current = summarize(state)
          publish()
          persist()
        }
        return
      }
      if (toolNow === 'bus') {
        const built = buildStop(state, tile.c, tile.r)
        if (built === 'road' && !quiet) showToast('巴士站要撳喺路上。')
        else if (built === 'money') showToast('庫房唔夠。')
        else if (built === 'have' && !quiet) showToast('呢度有站。')
        else if (built === 'ok') {
          state.guide = false
          navigator.vibrate?.(10)
          summaryRef.current = summarize(state)
          publish()
          persist()
        }
        return
      }
      if (toolNow === 'bulldoze') {
        const hit = STATIONS.find(
          (station) => state.stations.includes(station.id) && (station.c - tile.c) ** 2 + (station.r - tile.r) ** 2 < 0.8,
        )
        if (hit && !state.cells.some((cell) => cell.c === tile.c && cell.r === tile.r)) {
          state.stations = state.stations.filter((id) => id !== hit.id)
          state.money += Math.round(STATION_COST * 0.35)
          summaryRef.current = summarize(state)
          publish()
          persist()
          return
        }
      }
      const result = place(state, toolNow, tile.c, tile.r)
      if (result.ok && toolNow === 'bulldoze') {
        state.stops = state.stops.filter((stop) => stop.c !== tile.c || stop.r !== tile.r)
      }
      if (!result.ok) {
        const message = reasonCopy(result.reason)
        if (message && (!quiet || result.reason === 'money')) showToast(message)
        return
      }
      navigator.vibrate?.(10)
      summaryRef.current = summarize(state)
      syncTraffic(playActors.current, state, summarize(state))
      publish()
      persist()
    }

    const onDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId)
      const point = pointOf(event)
      pointers.set(event.pointerId, { x: point.x, y: point.y, ox: point.x, oy: point.y, moved: false })
      pinched = false
      lastPaint = ''
      painting = (event.pointerType === 'mouse' && event.shiftKey) || paintRef.current
      if (pointers.size === 1) {
        const cam = camRef.current
        panOrigin = cam ? { x: point.x, y: point.y, camX: cam.x, camY: cam.y } : null
        pinch = null
        if (painting) actAt(point.x, point.y, true)
      } else if (pointers.size === 2) {
        pinch = pairMetrics()
        painting = false
      }
    }

    const onMove = (event: PointerEvent) => {
      const point = pointOf(event)
      const tracked = pointers.get(event.pointerId)
      if (tracked) {
        if ((point.x - tracked.ox) ** 2 + (point.y - tracked.oy) ** 2 > 36) tracked.moved = true
        tracked.x = point.x
        tracked.y = point.y
      }
      if (pointers.size >= 2 && pinch) {
        const next = pairMetrics()
        if (next && camRef.current) {
          zoomAt(next.midX, next.midY, camRef.current.zoom * (next.d / pinch.d))
          const cam = camRef.current
          if (cam) {
            cam.x += next.midX - pinch.midX
            cam.y += next.midY - pinch.midY
          }
          pinch = next
          pinched = true
        }
        ghostRef.current = null
        return
      }
      if (painting && tracked?.moved) {
        actAt(point.x, point.y, true)
        userMoved.current = true
        return
      }
      if (panOrigin && tracked?.moved && camRef.current && !painting) {
        camRef.current = {
          ...camRef.current,
          x: panOrigin.camX + (point.x - panOrigin.x),
          y: panOrigin.camY + (point.y - panOrigin.y),
        }
        userMoved.current = true
        ghostRef.current = null
        return
      }
      ghostAt(point.x, point.y)
    }

    const onUp = (event: PointerEvent) => {
      const tracked = pointers.get(event.pointerId)
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = null
      if (!tracked || pinched || pointers.size > 0) return
      if (!tracked.moved) {
        const point = pointOf(event)
        lastPaint = ''
        actAt(point.x, point.y)
      }
      painting = false
      panOrigin = null
    }

    const pairMetrics = () => {
      const pts = [...pointers.values()]
      if (pts.length < 2) return null
      return {
        d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const point = pointOf(event)
      const cam = camRef.current
      if (!cam) return
      zoomAt(point.x, point.y, cam.zoom * (event.deltaY > 0 ? 0.92 : 1.08))
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
      const index = keys.indexOf(event.key)
      if (index >= 0) {
        const next = TOOLS[index].id
        toolRef.current = next
        setTool(next)
      }
      if (event.key === ' ') {
        event.preventDefault()
        const state = stateRef.current
        if (state && modeRef.current === 'play') {
          state.paused = !state.paused
          publish()
        }
      }
      const cam = camRef.current
      if (!cam) return
      const step = 48
      if (event.key === 'ArrowLeft' || event.key === 'a') cam.x += step
      if (event.key === 'ArrowRight' || event.key === 'd') cam.x -= step
      if (event.key === 'ArrowUp' || event.key === 'w') cam.y += step
      if (event.key === 'ArrowDown' || event.key === 's') cam.y -= step
      if (event.key === '+' || event.key === '=') zoomAt(viewRef.current.w / 2, viewRef.current.h / 2, cam.zoom * 1.1)
      if (event.key === '-' || event.key === '_') zoomAt(viewRef.current.w / 2, viewRef.current.h / 2, cam.zoom / 1.1)
    }

    const draw = (now: number) => {
      raf = window.requestAnimationFrame(draw)
      const dt = Math.min(100, now - last)
      last = now
      const view = viewRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx || view.w < 2) return
      const playing = modeRef.current === 'play' && stateRef.current
      const state = playing ? stateRef.current : demoRef.current
      if (!state || !demoRef.current) return
      const summary = playing ? tick(state, dt) : summarize(state)
      if (playing) summaryRef.current = summary
      const actors = playing ? playActors.current : demoActors.current
      if (hudClock <= 0) syncTraffic(actors, state, summary)
      if (!playing || !state.paused) stepTraffic(actors, state, summary, dt / 1000)
      const cam = camRef.current
      if (!cam) return
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
      renderFrame({
        ctx,
        width: view.w,
        height: view.h,
        dpr: view.dpr,
        seed: state.seed,
        day: state.day,
        cells: state.cells,
        cam,
        time: now,
        summary,
        actors,
        ghost: playing ? ghostRef.current : null,
        raining: isRaining(state.day, state.seed),
        builtStations: state.stations ?? [],
        stops: state.stops ?? [],
        transitHints: playing ? toolRef.current === 'mtr' : true,
        activeLine: lineRef.current,
        signal: typhoonSignal(state.day, state.seed),
        piers: state.piers ?? [],
        trams: state.trams ?? [],
      })
      hudClock += dt
      if (playing && (hudNow.current || hudClock > 250)) {
        hudClock = 0
        hudNow.current = false
        publish()
      }
      saveClock += dt
      if (playing && saveClock > 4000) {
        saveClock = 0
        persist()
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    document.addEventListener('visibilitychange', onHide)
    raf = window.requestAnimationFrame(draw)
    publish()

    return () => {
      window.clearTimeout(readyTimer)
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  const begin = (kind: 'new' | 'continue') => {
    if (kind === 'continue') {
      const saved = readSave()
      if (saved) {
        stateRef.current = saved.state
        camRef.current = saved.cam
        userMoved.current = true
        summaryRef.current = summarize(saved.state)
        syncTraffic(playActors.current, saved.state, summarize(saved.state))
        modeRef.current = 'play'
        hudNow.current = true
        setCityName(saved.state.name || '我座城')
        setMode('play')
        setConfirmNew(false)
        return
      }
    }
    const seed = Math.floor(Math.random() * 1_000_000_000)
    const state = newGame(seed)
    setCityName(state.name)
    stateRef.current = state
    summaryRef.current = summarize(state)
    playActors.current = []
    clearSave()
    const view = viewRef.current
    camRef.current = framePlay(view.w || 800, view.h || 600)
    userMoved.current = false
    modeRef.current = 'play'
    hudNow.current = true
    setHasSave(false)
    setMode('play')
    setConfirmNew(false)
    setTool('road')
    toolRef.current = 'road'
  }

  const backToTitle = () => {
    const state = stateRef.current
    const cam = camRef.current
    if (state) {
      const summary = summaryRef.current ?? summarize(state)
      const snap = snapOf(summary)
      setToast(tomorrowLine(state.day, state.seed, snap.ferries >= 1 || snap.mtrLinked >= 2))
    }
    if (state && cam) {
      setHasSave(writeSave(state, cam))
    }
    modeRef.current = 'title'
    setMode('title')
    const view = viewRef.current
    camRef.current = frameLand(view.w || 800, view.h || 600)
  }

  const togglePause = () => {
    const state = stateRef.current
    if (!state) return
    state.paused = !state.paused
    setHud((current) => ({ ...current, paused: state.paused }))
  }

  const toggleFast = () => {
    const state = stateRef.current
    if (!state) return
    state.speed = state.speed === 3 ? 1 : 3
    setHud((current) => ({ ...current, fast: state.speed === 3 }))
  }

  const recenter = () => {
    const state = stateRef.current
    const view = viewRef.current
    if (!state || !view.w) return
    camRef.current = framePlay(view.w, view.h)
    userMoved.current = false
  }

  const paintCard = (name: string) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const card = document.createElement('canvas')
    card.width = 900
    card.height = 1200
    const ctx = card.getContext('2d')
    if (!ctx) return
    const summary = summaryRef.current ?? summarize(state)
    const snap = snapOf(summary)
    paintShareCard(
      ctx,
      {
        name,
        pop: summary.pop,
        day: state.day,
        money: state.money,
        nick: cityNickname(state, snap),
        story: todayStory(snap, null),
      },
      canvas,
    )
    setShareUrl(card.toDataURL('image/png'))
  }

  const openShare = () => {
    const state = stateRef.current
    if (!state) return
    const name = cityLabel(state.name)
    state.name = name
    setCityName(name)
    paintCard(name)
    setShareOpen(true)
  }

  const renameCity = (value: string) => {
    const name = value.slice(0, 12)
    setCityName(name)
    const state = stateRef.current
    if (state) state.name = name
    paintCard(name)
  }

  const downloadCard = () => {
    if (!shareUrl) return
    const link = document.createElement('a')
    link.href = shareUrl
    link.download = 'ngo-zo-sing.png'
    link.click()
  }

  const shareCard = async () => {
    const state = stateRef.current
    if (!shareUrl || !state) return
    const caption = shareCaption({
      name: state.name,
      pop: summaryRef.current?.pop ?? 0,
      day: state.day,
      money: state.money,
    })
    try {
      const blob = await (await fetch(shareUrl)).blob()
      const file = new File([blob], 'ngo-zo-sing.png', { type: 'image/png' })
      const nav = navigator
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: cityLabel(state.name), text: caption })
        return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
    downloadCard()
  }

  const saveNow = () => {
    const state = stateRef.current
    const cam = camRef.current
    if (!state || !cam) return
    if (writeSave(state, cam)) {
      setHasSave(true)
      setToast('儲低咗。')
      window.setTimeout(() => setToast((current) => (current === '儲低咗。' ? null : current)), 1200)
    } else {
      setToast('呢部機記唔到。')
    }
  }

  return (
    <div className="city-root">
      <canvas ref={canvasRef} aria-label="城市地圖" />
      {mode === 'title' ? (
        <div className="title-wrap">
          <div className="title-card">
            <p className="title-kicker">原創</p>
            <h1>我座城</h1>
            <p>維港兩邊，你嚟起。</p>
            {!ready ? (
              <p className="fine">載入緊…</p>
            ) : hasSave ? (
              <>
                <button className="btn-go" type="button" onClick={() => begin('continue')}>
                  繼續
                </button>
                <button className="btn-text" type="button" onClick={() => setConfirmNew(true)}>
                  開新城
                </button>
              </>
            ) : (
              <button className="btn-go" type="button" onClick={() => begin('new')}>
                開波
              </button>
            )}
            <p className="fine">記喺呢部機，唔使登入。</p>
          </div>
        </div>
      ) : (
        <>
          <header className="topbar">
            <strong>{hud.when}</strong>
            {hud.rain ? <span>落緊雨</span> : null}
            <span className="stat">
              庫房 <b>{hud.money}</b>{' '}
              <span className={hud.deltaUp ? 'delta-up' : 'delta-down'}>{hud.delta}</span>
            </span>
            <span className="stat">
              人口 <b>{hud.pop}</b>
            </span>
            <div className="top-actions">
              <button className="mini" type="button" onClick={togglePause}>
                {hud.paused ? '行住' : '暫停'}
              </button>
              <button className="mini" type="button" onClick={saveNow}>
                儲低
              </button>
              <button className="mini" type="button" onClick={openShare}>
                分享
              </button>
              <button className="mini" type="button" onClick={backToTitle}>
                封面
              </button>
            </div>
          </header>
          <aside className="side">
            <h1>我座城</h1>
            {hud.nick ? <p className="nick">{hud.nick}</p> : null}
            {hud.story ? <p className="story">今日城事：{hud.story}</p> : null}
            <p className="when">
              {hud.when}
              {hud.rain ? ' · 落緊雨' : ''}
            </p>
            <div className="side-stats">
              <div>
                <span>庫房</span>
                <strong>{hud.money}</strong>
              </div>
              <div>
                <span>今日</span>
                <strong className={hud.deltaUp ? 'delta-up' : 'delta-down'}>{hud.delta}</strong>
              </div>
              <div>
                <span>人口</span>
                <strong>{hud.pop}</strong>
              </div>
              <div>
                <span>職位</span>
                <strong>{hud.jobs}</strong>
              </div>
            </div>
            <ul className="demands">
              {hud.demands.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="side-actions">
              <button className="mini" type="button" onClick={togglePause}>
                {hud.paused ? '行住' : '暫停'}
              </button>
              <button className="mini" type="button" onClick={toggleFast} aria-pressed={hud.fast}>
                快
              </button>
              <button className="mini" type="button" onClick={saveNow}>
                儲低
              </button>
              <button className="mini" type="button" onClick={openShare}>
                分享
              </button>
              <button className="mini" type="button" onClick={recenter}>
                返中
              </button>
              <button className="mini" type="button" onClick={backToTitle}>
                封面
              </button>
              <button className="mini" type="button" onClick={() => setConfirmNew(true)}>
                開新城
              </button>
            </div>
          </aside>
          {hud.tease ? <p className="tease">{hud.tease}</p> : null}
          <p className="coach" aria-live="polite">
            {hud.coach}
          </p>
          {tool === 'mtr' ? (
            <div className="lines" role="tablist" aria-label="路綫">
              {LINES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="line"
                  aria-pressed={line === item.id}
                  style={{ borderColor: LINE_COLOR[item.id], color: line === item.id ? '#24170d' : LINE_COLOR[item.id], background: line === item.id ? LINE_COLOR[item.id] : 'rgba(8,16,22,0.82)' }}
                  onClick={() => {
                    lineRef.current = item.id
                    setLine(item.id)
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="zoom">
            <button type="button" aria-label="放大" onClick={() => zoomCenter(camRef, viewRef, 1.12)}>
              ＋
            </button>
            <button type="button" aria-label="縮細" onClick={() => zoomCenter(camRef, viewRef, 1 / 1.12)}>
              －
            </button>
            <button type="button" onClick={recenter}>
              返中
            </button>
          </div>
          {narrow && moreTools ? (
            <div className="more-sheet" role="toolbar" aria-label="其他工具">
              {phoneDock(hud.goalId).more.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="tool"
                  aria-pressed={tool === item.id}
                  onClick={() => {
                    toolRef.current = item.id
                    setTool(item.id)
                    setMoreTools(false)
                  }}
                >
                  <ToolMark id={item.id} />
                  {item.label}
                  <small>{toolPrice(item.id)}</small>
                </button>
              ))}
              <button
                type="button"
                className="tool"
                aria-pressed={paint}
                onClick={() => {
                  paintRef.current = !paint
                  setPaint((value) => !value)
                  setMoreTools(false)
                }}
              >
                連續
                <small>拖住起</small>
              </button>
              <button
                type="button"
                className="tool"
                aria-pressed={hud.fast}
                onClick={() => {
                  toggleFast()
                  setMoreTools(false)
                }}
              >
                快
                <small>{hud.fast ? '行緊' : '平時'}</small>
              </button>
            </div>
          ) : null}
          <div className="dock" role="toolbar" aria-label="建造">
            {(narrow ? phoneDock(hud.goalId).main : TOOLS).map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === 'road' && hud.roads === 0 ? 'tool pulse' : 'tool'}
                aria-pressed={tool === item.id}
                onClick={() => {
                  toolRef.current = item.id
                  setTool(item.id)
                }}
              >
                <ToolMark id={item.id} />
                {item.label}
                <small>{toolPrice(item.id)}</small>
              </button>
            ))}
            {narrow ? (
              <button type="button" className="tool" aria-pressed={moreTools} onClick={() => setMoreTools((open) => !open)}>
                更多
                <small>{moreTools ? '收埋' : '其餘'}</small>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="tool"
                  aria-pressed={paint}
                  onClick={() => {
                    paintRef.current = !paint
                    setPaint((value) => !value)
                  }}
                >
                  連續
                  <small>拖住起</small>
                </button>
                <button type="button" className="tool" aria-pressed={hud.fast} onClick={toggleFast}>
                  快
                  <small>{hud.fast ? '行緊' : '平時'}</small>
                </button>
              </>
            )}
          </div>
        </>
      )}
      {toast ? <div className="toast">{toast}</div> : null}
      {confirmNew ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal-card">
            <p id="confirm-title">開新城會清咗而家呢座。確定？</p>
            <div className="modal-actions">
              <button className="no" type="button" onClick={() => setConfirmNew(false)}>
                算
              </button>
              <button className="yes" type="button" onClick={() => begin('new')}>
                確定
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {shareOpen && shareUrl ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="modal-card share-card">
            <p id="share-title">分享呢座城</p>
            <label className="share-name">
              城名
              <input
                value={cityName}
                maxLength={12}
                aria-label="城名"
                onChange={(event) => renameCity(event.target.value)}
              />
            </label>
            <canvas ref={previewRef} width={900} height={1200} aria-label="城市分享卡" />
            <div className="modal-actions">
              <button className="no" type="button" onClick={() => setShareOpen(false)}>
                收埋
              </button>
              <button className="no" type="button" onClick={downloadCard}>
                儲低圖片
              </button>
              <button className="yes" type="button" onClick={() => void shareCard()}>
                分享
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function phoneDock(goalId: string): { main: typeof TOOLS; more: typeof TOOLS } {
  const wanted = goalTool(goalId)
  const mainIds: Tool[] = []
  if (wanted && wanted !== 'road' && wanted !== 'home' && wanted !== 'shop' && wanted !== 'bulldoze') mainIds.push(wanted)
  mainIds.push('road', 'home', 'shop', 'bulldoze')
  const main = mainIds.map((id) => TOOLS.find((item) => item.id === id)).filter((item): item is (typeof TOOLS)[number] => Boolean(item))
  const more = TOOLS.filter((item) => !mainIds.includes(item.id))
  return { main, more }
}

function ToolMark({ id }: { id: Tool | 'paint' | 'fast' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  if (id === 'road') {
    return (
      <svg {...common}>
        <path d="M3 9h12M9 3v12" />
      </svg>
    )
  }
  if (id === 'home') {
    return (
      <svg {...common}>
        <path d="M3 8.5 9 3l6 5.5V15H3z" />
      </svg>
    )
  }
  if (id === 'shop') {
    return (
      <svg {...common}>
        <path d="M3 8h12l-1.2 3H4.2zM4 11v5h10v-5" />
      </svg>
    )
  }
  if (id === 'factory') {
    return (
      <svg {...common}>
        <path d="M3 15V8l4 2V8l4 2V7h4v8z" />
      </svg>
    )
  }
  if (id === 'park') {
    return (
      <svg {...common}>
        <circle cx="9" cy="7" r="3.2" />
        <path d="M9 10v5" />
      </svg>
    )
  }
  if (id === 'power') {
    return (
      <svg {...common}>
        <path d="M8 2.5 4.5 10H8l-1 5.5L13.5 8H9.5z" />
      </svg>
    )
  }
  if (id === 'mtr') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="12" height="7" rx="2" />
        <path d="M6 12v2M12 12v2" />
      </svg>
    )
  }
  if (id === 'bus') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="12" height="10" rx="2" />
        <path d="M3 8h12" />
      </svg>
    )
  }
  if (id === 'ferry') {
    return (
      <svg {...common}>
        <path d="M3 11h12l-1.5 3h-9zM9 4v7" />
      </svg>
    )
  }
  if (id === 'tram') {
    return (
      <svg {...common}>
        <rect x="2" y="7" width="14" height="5" rx="1" />
        <path d="M9 3v4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 4l10 10M14 4 4 14" />
    </svg>
  )
}

function toolPrice(id: Tool): string {
  if (id === 'bulldoze') return '退少少'
  if (id === 'mtr') return formatMoney(STATION_COST)
  if (id === 'bus') return formatMoney(STOP_COST)
  if (id === 'ferry') return formatMoney(PIER_COST)
  if (id === 'tram') return formatMoney(TRAM_COST)
  return formatMoney(COST[id])
}

function typhoonLabel(signal: 0 | 1 | 3 | 8): string {
  if (signal === 8) return ' · 掛八號'
  if (signal === 3) return ' · 掛三號'
  if (signal === 1) return ' · 掛一號'
  return ''
}

function zoomCenter(
  camRef: { current: Cam | null },
  viewRef: { current: { w: number; h: number } },
  factor: number,
) {
  const cam = camRef.current
  const view = viewRef.current
  if (!cam || !view.w) return
  const sx = view.w / 2
  const sy = view.h / 2
  const zoom = clampZoom(cam.zoom * factor)
  const wx = (sx - cam.x) / cam.zoom
  const wy = (sy - cam.y) / cam.zoom
  camRef.current = { zoom, x: sx - wx * zoom, y: sy - wy * zoom }
}
