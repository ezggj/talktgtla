import { dayNumber } from './sim'

export interface ShareFacts {
  name: string
  pop: number
  day: number
  money: number
  nick?: string
  story?: string
}

export function cityLabel(name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 12)
  return clean || '我座城'
}

export function shareCaption(facts: ShareFacts): string {
  const name = cityLabel(facts.name)
  return `${name}，第${dayNumber(facts.day)}日，人口 ${facts.pop}。維港兩邊，你起緊。`
}

export function paintShareCard(
  ctx: CanvasRenderingContext2D,
  facts: ShareFacts,
  map: CanvasImageSource,
): void {
  const width = 900
  const height = 1200
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f3ecdf'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#16343c'
  ctx.fillRect(0, 0, width, 168)
  ctx.fillStyle = '#f0a35a'
  ctx.fillRect(0, 168, width, 8)

  const name = cityLabel(facts.name)
  ctx.fillStyle = '#f0a35a'
  ctx.font = '500 24px "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.textAlign = 'left'
  if (facts.nick) ctx.fillText(facts.nick, 48, 58)
  ctx.fillStyle = '#f6f1e7'
  ctx.font = '600 54px "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.fillText(name, 48, 112)

  ctx.save()
  ctx.beginPath()
  ctx.rect(48, 214, 804, 620)
  ctx.clip()
  ctx.drawImage(map, 48, 214, 804, 620)
  ctx.restore()
  ctx.strokeStyle = '#d9cbb6'
  ctx.lineWidth = 2
  ctx.strokeRect(48, 214, 804, 620)

  ctx.fillStyle = '#24170d'
  ctx.font = '600 28px "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.fillText(`人口 ${facts.pop}`, 48, 900)
  ctx.fillText(`第${dayNumber(facts.day)}日`, 320, 900)
  ctx.fillText(`庫房 ${facts.money}`, 520, 900)

  ctx.font = '400 32px "PingFang HK", "Noto Sans TC", sans-serif'
  const story = facts.story ? `今日城事：${facts.story}` : ''
  if (story) wrapText(ctx, story, 48, 960, 800, 42)
  wrapText(ctx, shareCaption(facts), 48, story ? 1048 : 980, 800, 46)

  ctx.fillStyle = '#6d6256'
  ctx.font = '400 22px "PingFang HK", "Noto Sans TC", sans-serif'
  ctx.fillText('我座城 · 記喺呢部機', 48, 1140)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  line: number,
) {
  let row = ''
  for (const ch of text) {
    const next = row + ch
    if (ctx.measureText(next).width > max && row) {
      ctx.fillText(row, x, y)
      row = ch
      y += line
    } else row = next
  }
  if (row) ctx.fillText(row, x, y)
}
