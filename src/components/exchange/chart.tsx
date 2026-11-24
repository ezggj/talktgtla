'use client'

import { useEffect, useRef } from 'react'
import { exponentialAverage, movingAverage } from '@/exchange/indicators'
import type { Candle } from '@/exchange/yahoo'

export function CandleChart({
  candles,
  showMa,
  showEma,
  showVolume,
  limitPrice,
  onLimit,
}: {
  candles: Candle[]
  showMa: boolean
  showEma: boolean
  showVolume: boolean
  limitPrice: number | null
  onLimit?: (price: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const wrap = canvas.parentElement
      const width = wrap?.clientWidth || 320
      const room = wrap?.clientHeight || 0
      const height = width < 520 ? (showVolume ? 210 : 160) : Math.max(240, Math.min(room || 460, 560))
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
      const shown = candles.slice(-90)
      if (shown.length < 2) {
        ctx.fillStyle = '#d5dde6'
        ctx.font = '16px "PingFang HK", sans-serif'
        ctx.fillText('圖暫時冇', 16, 36)
        return
      }
      const volumeBand = showVolume ? Math.round(height * 0.22) : 0
      const plotBottom = height - volumeBand - 8
      const max = Math.max(...shown.map((candle) => candle.h))
      const min = Math.min(...shown.map((candle) => candle.l))
      const span = max - min || 1
      const padX = 8
      const padY = 12
      const slot = (width - padX * 2) / shown.length
      const yOf = (value: number) => padY + ((max - value) / span) * (plotBottom - padY)
      ctx.strokeStyle = 'rgba(232, 237, 242, 0.12)'
      ctx.lineWidth = 1
      for (let i = 1; i <= 3; i += 1) {
        const y = (plotBottom / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      const maxVol = Math.max(...shown.map((candle) => candle.v || 0), 1)
      for (const [index, candle] of shown.entries()) {
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
        if (showVolume && candle.v > 0) {
          const bar = ((candle.v / maxVol) * (volumeBand - 4))
          ctx.globalAlpha = 0.55
          ctx.fillRect(x - Math.max(1, slot * 0.28), height - bar, Math.max(2, slot * 0.56), bar)
          ctx.globalAlpha = 1
        }
      }
      const closes = shown.map((candle) => candle.c)
      const drawLine = (series: Array<number | null>, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.4
        ctx.beginPath()
        let started = false
        series.forEach((value, index) => {
          if (value == null) return
          const x = padX + index * slot + slot / 2
          const y = yOf(value)
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }
      if (showMa) drawLine(movingAverage(closes, 20), '#7dcec4')
      if (showEma) drawLine(exponentialAverage(closes, 20), '#8eb4ff')
      if (limitPrice != null && limitPrice > 0) {
        const y = yOf(Math.min(max, Math.max(min, limitPrice)))
        ctx.strokeStyle = '#e7edf4'
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    return () => observer.disconnect()
  }, [candles, showMa, showEma, showVolume, limitPrice])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !onLimit) return
    const move = (clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const shown = candles.slice(-90)
      if (shown.length < 2) return
      const height = rect.height
      const volumeBand = showVolume ? Math.round(height * 0.22) : 0
      const plotBottom = height - volumeBand - 8
      const max = Math.max(...shown.map((candle) => candle.h))
      const min = Math.min(...shown.map((candle) => candle.l))
      const span = max - min || 1
      const y = clientY - rect.top
      const price = max - ((y - 12) / Math.max(1, plotBottom - 12)) * span
      if (Number.isFinite(price) && price > 0) onLimit(price)
    }
    const pointer = (event: PointerEvent) => {
      if (event.buttons === 0 && event.type === 'pointermove') return
      move(event.clientY)
    }
    canvas.addEventListener('pointerdown', pointer)
    canvas.addEventListener('pointermove', pointer)
    return () => {
      canvas.removeEventListener('pointerdown', pointer)
      canvas.removeEventListener('pointermove', pointer)
    }
  }, [candles, onLimit, showVolume])

  return <canvas ref={ref} className="chart" aria-label="蠟燭圖" />
}
