/** Canvas share cards for finished workout / meal — one-tap PNG download or Web Share. */

export type WorkoutSharePayload = {
  title?: string
  volume: number
  sets: number
  durationSec: number
  topExercises: string[]
  dateLabel: string
  tip?: string
  /** e.g. "深蹲 100×5" */
  prs?: string[]
  /** Share image palette. Self-contained either way, so it stays crisp on dark or light feeds. */
  tone?: 'light' | 'dark'
}

export type ShareTone = 'light' | 'dark'

export function currentShareTone(): ShareTone {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export type MealSharePayload = {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  dateLabel: string
  note?: string
}

export type NutritionWeekSharePayload = {
  title: string
  dateLabel: string
  avgProtein: number
  goal: number
  pct: number
  daysLogged: number
  daysHit: number
  lines: string[]
  vibe?: string
}

const SITE = 'https://talktgtla.com/start?from=threads'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function formatDur(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 貼地廣東話 caption — Threads / IG Story 用 */
export function workoutShareCaption(payload: WorkoutSharePayload): string {
  const day = payload.title?.trim() || '訓練'
  const vol = Math.round(payload.volume).toLocaleString()
  const focus = payload.topExercises[0]
  const bits = [`今日${day}打完 ✅`, `${payload.sets} 組 · ${vol} 容量 · ${formatDur(payload.durationSec)}`]
  if (payload.prs?.length) bits.push(`PR：${payload.prs.slice(0, 3).join('、')}`)
  if (focus) bits.push(`重點：${focus}`)
  bits.push('用 Talk tgt la 免費記組')
  bits.push(SITE)
  bits.push('#香港健身 #記組 #TalkTgtLa')
  return bits.join('\n')
}

export function mealShareCaption(payload: MealSharePayload): string {
  const name = payload.name.trim() || '呢餐'
  return [
    `食咗：${name} 🍽`,
    `${Math.round(payload.kcal)} kcal · 蛋白 ${Math.round(payload.protein)}g`,
    'Talk tgt la 港式飲食一掣記',
    SITE,
    '#港式飲食 #健身飲食 #TalkTgtLa',
  ].join('\n')
}

export function nutritionWeekShareCaption(payload: NutritionWeekSharePayload): string {
  const bits = [
    `呢個星期飲食週報 🍽`,
    payload.title,
    `平均蛋白 ${Math.round(payload.avgProtein)}g（目標 ${payload.goal}g · ${payload.pct}%）`,
    `有記 ${payload.daysLogged} 日 · 到標 ${payload.daysHit} 日`,
  ]
  if (payload.lines[0]) bits.push(payload.lines[0])
  bits.push('Talk tgt la 飲食')
  bits.push(SITE)
  bits.push('#港式飲食 #健身飲食 #TalkTgtLa')
  return bits.join('\n')
}

export function threadsIntentUrl(caption: string): string {
  return `https://www.threads.net/intent/post?text=${encodeURIComponent(caption)}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1)
  return `${s}…`
}

export function drawWorkoutShareCard(payload: WorkoutSharePayload): HTMLCanvasElement {
  const tone = payload.tone === 'dark' ? 'dark' : 'light'
  const dark = tone === 'dark'
  const ink = dark ? '#FAFAF9' : '#1C1917'
  const muted = dark ? '#A8A29E' : '#78716C'
  const accent = dark ? '#5EEAD4' : '#0F766E'
  const card = dark ? '#171C1B' : '#FFFFFF'
  const stat = dark ? '#222A28' : '#F5F5F4'
  const frame = dark ? '#0C0F0E' : '#E7E5E4'

  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = frame
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = card
  roundRect(ctx, 48, 48, W - 96, H - 96, 40)
  ctx.fill()
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(28,25,23,0.08)'
  ctx.lineWidth = 2
  ctx.stroke()

  const left = 96
  const inner = W - 192

  ctx.fillStyle = accent
  ctx.font = '600 32px system-ui, "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.fillText('Talk tgt la', left, 140)

  ctx.fillStyle = ink
  ctx.font = '700 68px Georgia, "Fraunces", serif'
  ctx.fillText(fitText(ctx, payload.title || '搞掂', inner), left, 230)

  ctx.fillStyle = muted
  ctx.font = '400 30px system-ui, "PingFang HK", sans-serif'
  ctx.fillText(fitText(ctx, payload.dateLabel, inner), left, 284)

  const prCount = payload.prs?.length ?? 0
  const stats = [
    { label: '容量', value: Math.round(payload.volume).toLocaleString() },
    { label: '組數', value: String(payload.sets) },
    prCount > 0
      ? { label: 'PR', value: String(prCount) }
      : { label: '時長', value: formatDur(payload.durationSec) },
  ]
  const boxW = 280
  const gap = 24
  stats.forEach((s, i) => {
    const x = left + i * (boxW + gap)
    ctx.fillStyle = stat
    roundRect(ctx, x, 330, boxW, 176, 28)
    ctx.fill()
    ctx.fillStyle = ink
    ctx.font = '700 56px system-ui, "PingFang HK", sans-serif'
    ctx.fillText(fitText(ctx, s.value, boxW - 48), x + 24, 430)
    ctx.fillStyle = muted
    ctx.font = '500 26px system-ui, "PingFang HK", sans-serif'
    ctx.fillText(s.label, x + 24, 474)
  })

  let y = 560
  if (prCount > 0) {
    ctx.fillStyle = accent
    ctx.font = '600 30px system-ui, "PingFang HK", sans-serif'
    const prLine = payload.prs!.slice(0, 3).join('  ·  ')
    ctx.fillText(fitText(ctx, prLine, inner), left, y)
    y += 56
  }

  ctx.fillStyle = ink
  ctx.font = '600 32px system-ui, "PingFang HK", sans-serif'
  ctx.fillText('今日重點', left, y)
  y += 48
  ctx.font = '400 30px system-ui, "PingFang HK", sans-serif'
  ctx.fillStyle = dark ? '#E7E5E4' : '#44403C'
  payload.topExercises.slice(0, 5).forEach((line) => {
    ctx.fillText(fitText(ctx, line, inner), left, y)
    y += 46
  })

  if (payload.tip) {
    const tipY = 1120
    ctx.fillStyle = dark ? 'rgba(94,234,212,0.12)' : 'rgba(15,118,110,0.08)'
    roundRect(ctx, left, tipY - 40, inner, 88, 22)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.font = '500 28px system-ui, "PingFang HK", sans-serif'
    ctx.fillText(fitText(ctx, payload.tip, inner - 48), left + 24, tipY + 14)
  }

  ctx.fillStyle = muted
  ctx.font = '400 24px system-ui, sans-serif'
  ctx.fillText('talktgtla.com', left, H - 100)

  return canvas
}

export function drawMealShareCard(payload: MealSharePayload): HTMLCanvasElement {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#FEF3C7')
  g.addColorStop(0.4, '#FAFAF9')
  g.addColorStop(1, '#CCFBF1')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  roundRect(ctx, 64, 80, W - 128, H - 160, 48)
  ctx.fill()

  ctx.fillStyle = '#0F766E'
  ctx.font = '600 34px system-ui, "PingFang HK", sans-serif'
  ctx.fillText('Talk tgt la · 飲食', 112, 180)

  ctx.fillStyle = '#1A1A1A'
  ctx.font = '700 64px Georgia, "Fraunces", serif'
  const name = payload.name.length > 14 ? payload.name.slice(0, 14) + '…' : payload.name
  ctx.fillText(name, 112, 290)

  ctx.fillStyle = '#6B6B6B'
  ctx.font = '400 30px system-ui, "PingFang HK", sans-serif'
  ctx.fillText(payload.dateLabel, 112, 350)

  const macros = [
    { label: 'kcal', value: String(Math.round(payload.kcal)), color: '#1A1A1A' },
    { label: '蛋白 g', value: String(Math.round(payload.protein)), color: '#0F766E' },
    { label: '碳水 g', value: String(Math.round(payload.carbs)), color: '#D97706' },
    { label: '脂肪 g', value: String(Math.round(payload.fat)), color: '#7C3AED' },
  ]
  macros.forEach((m, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 112 + col * 440
    const y = 420 + row * 200
    ctx.fillStyle = '#F7F7F5'
    roundRect(ctx, x, y, 400, 160, 28)
    ctx.fill()
    ctx.fillStyle = m.color
    ctx.font = '700 56px system-ui, sans-serif'
    ctx.fillText(m.value, x + 32, y + 90)
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '500 28px system-ui, "PingFang HK", sans-serif'
    ctx.fillText(m.label, x + 32, y + 130)
  })

  if (payload.note) {
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '400 28px system-ui, "PingFang HK", sans-serif'
    const note = payload.note.length > 40 ? payload.note.slice(0, 40) + '…' : payload.note
    ctx.fillText(note, 112, 920)
  }

  ctx.fillStyle = '#9A9A9A'
  ctx.font = '400 26px system-ui, sans-serif'
  ctx.fillText('talktgtla.com', 112, H - 120)

  return canvas
}

export function drawNutritionWeekShareCard(payload: NutritionWeekSharePayload): HTMLCanvasElement {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#0F766E')
  g.addColorStop(0.45, '#134e4a')
  g.addColorStop(1, '#FEF3C7')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  roundRect(ctx, 64, 120, W - 128, H - 240, 48)
  ctx.fill()

  ctx.fillStyle = '#0F766E'
  ctx.font = '600 34px system-ui, "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.fillText('Talk tgt la · 飲食週報', 112, 220)

  ctx.fillStyle = '#1A1A1A'
  ctx.font = '700 64px Georgia, "Fraunces", serif'
  const title = payload.title.length > 12 ? payload.title.slice(0, 12) + '…' : payload.title
  ctx.fillText(title, 112, 310)

  ctx.fillStyle = '#6B6B6B'
  ctx.font = '400 30px system-ui, "PingFang HK", sans-serif'
  ctx.fillText(payload.dateLabel, 112, 370)

  const stats = [
    { label: '平均蛋白', value: `${Math.round(payload.avgProtein)}g` },
    { label: '目標達成', value: `${payload.pct}%` },
    { label: '到標日', value: `${payload.daysHit}/${payload.daysLogged || 0}` },
  ]
  stats.forEach((s, i) => {
    const x = 112 + i * 300
    ctx.fillStyle = '#F0EFEE'
    roundRect(ctx, x, 430, 260, 180, 28)
    ctx.fill()
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '700 48px system-ui, sans-serif'
    ctx.fillText(s.value, x + 24, 530)
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '500 26px system-ui, "PingFang HK", sans-serif'
    ctx.fillText(s.label, x + 24, 580)
  })

  ctx.fillStyle = '#1A1A1A'
  ctx.font = '600 34px system-ui, "PingFang HK", sans-serif'
  ctx.fillText('呢個星期', 112, 700)
  ctx.font = '400 30px system-ui, "PingFang HK", sans-serif'
  ctx.fillStyle = '#3D3D3D'
  payload.lines.slice(0, 4).forEach((line, i) => {
    const t = line.length > 28 ? line.slice(0, 28) + '…' : line
    ctx.fillText(`· ${t}`, 112, 760 + i * 56)
  })

  ctx.fillStyle = '#0F766E'
  ctx.font = '500 28px system-ui, "PingFang HK", sans-serif'
  ctx.fillText(`目標每日 ${payload.goal}g 蛋白`, 112, 1080)

  ctx.fillStyle = '#9A9A9A'
  ctx.font = '400 26px system-ui, sans-serif'
  ctx.fillText('talktgtla.com', 112, H - 160)

  return canvas
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

export async function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  shareTitle: string,
  shareText?: string
): Promise<'shared' | 'downloaded'> {
  const blob = await canvasToBlob(canvas)
  const file = new File([blob], filename, { type: 'image/png' })
  const text = shareText || shareTitle

  const nav = typeof navigator !== 'undefined' ? navigator : null
  if (nav && typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({ files: [file], title: shareTitle, text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
    }
  }

  await downloadCanvasPng(canvas, filename)
  return 'downloaded'
}

/** IG：優先 Web Share 出圖+文案；唔得就下載 PNG + 複製 caption */
export async function shareForInstagram(
  canvas: HTMLCanvasElement,
  filename: string,
  caption: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const blob = await canvasToBlob(canvas)
  const file = new File([blob], filename, { type: 'image/png' })
  await copyText(caption)

  const nav = typeof navigator !== 'undefined' ? navigator : null
  if (nav && typeof nav.share === 'function') {
    try {
      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title, text: caption })
        return 'shared'
      }
      await nav.share({ title, text: caption })
      await downloadCanvasPng(canvas, filename)
      return 'downloaded'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
    }
  }

  await downloadCanvasPng(canvas, filename)
  return 'downloaded'
}
