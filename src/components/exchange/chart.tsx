'use client'

import { useEffect, useRef } from 'react'
import type { Candle } from '@/exchange/yahoo'

export function CandleChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const width = canvas.parentElement?.clientWidth || 320
      const height = width < 520 ? 84 : 280
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#10151c'
      ctx.fillRect(0, 0, width, height)
      if (candles.length < 2) {
        ctx.fillStyle = '#8b95a3'
        ctx.font = '15px "PingFang HK", sans-serif'
        ctx.fillText('圖暫時冇', 16, 36)
        return
      }
      const max = Math.max(...candles.map((candle) => candle.h))
      const min = Math.min(...candles.map((candle) => candle.l))
      const span = max - min || 1
      const padX = 8
      const padY = 12
      const slot = (width - padX * 2) / candles.length
      const yOf = (value: number) => padY + ((max - value) / span) * (height - padY * 2)
      ctx.strokeStyle = 'rgba(232, 237, 242, 0.08)'
      ctx.lineWidth = 1
      for (let i = 1; i <= 3; i += 1) {
        const y = (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      for (const [index, candle] of candles.entries()) {
        const x = padX + index * slot + slot / 2
        const up = candle.c >= candle.o
        ctx.strokeStyle = up ? '#3dd68c' : '#ff5c6a'
        ctx.fillStyle = ctx.strokeStyle
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, yOf(candle.h))
        ctx.lineTo(x, yOf(candle.l))
        ctx.stroke()
        const top = yOf(Math.max(candle.o, candle.c))
        const bottom = yOf(Math.min(candle.o, candle.c))
        ctx.fillRect(x - Math.max(1.5, slot * 0.28), top, Math.max(2, slot * 0.56), Math.max(1, bottom - top))
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    return () => observer.disconnect()
  }, [candles])

  return <canvas ref={ref} className="chart" aria-label="蠟燭圖" />
}
