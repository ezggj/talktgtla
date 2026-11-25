'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FEE_RATE,
  MAX_LEVERAGE,
  MIN_NOTIONAL,
  STARTING_HKD,
  cancelOrder,
  effectiveLeverage,
  equity,
  freshAccount,
  liquidationPrice,
  movePct,
  placeLimit,
  realizedPnl,
  settle,
  trade,
  unrealized,
  unrealizedTotal,
  usedMargin,
  type Account,
  type Fill,
  type Side,
  type TradeError,
} from '@/exchange/book'
import { canPublishRank, cleanNick, mergeStanding, rankGains, rankLosses, type BoardRow } from '@/exchange/board'
import { drawdown, hongKongDay, hongKongWeek, rankSteady, rankWeekProfit, type Standing } from '@/exchange/challenges'
import { formatDisplay, fromDisplay, toDisplay, type DisplayCcy } from '@/exchange/display'
import { DEMO_TRADERS, demoSide } from '@/exchange/follow'
import { referenceLadder } from '@/exchange/ladder'
import { freshnessLabel, marketBySymbol, MARKETS, type MarketGroup, type MarketKind } from '@/exchange/markets'
import { GLOSSARY, tradeRecap } from '@/exchange/recap'
import { deskHighlight, leverageWarning, streakLine } from '@/exchange/story'
import { type Timeframe } from '@/exchange/timeframes'
import { highLeverageWarning, isTutorialDone, TUTORIAL_KEY, TUTORIAL_STEPS } from '@/exchange/tutorial'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { useUser } from '@/lib/auth/use-user'
import type { Candle } from '@/exchange/yahoo'
import { CandleChart } from './chart'
import './exchange.css'

const SAVE_KEY = 'si-pan:v1'
const BASE_LEVERAGES = [1, 5, 10, 20, 50]
const HIGH_LEVERAGES = [100, 500]
const AMOUNTS = [10_000, 50_000, 100_000]

interface PublicQuote {
  symbol: string
  name: string
  code: string
  kind: MarketKind
  feed: 'live' | 'delayed'
  hkd: number
  prevHkd: number
  at: number
  candles: Candle[]
  session: 'live' | 'close'
}

interface Feed {
  ok: boolean
  stale: boolean
  fx: number | null
  asOf: number | null
  quotes: PublicQuote[]
}

type View = 'market' | 'trade' | 'book' | 'board' | 'login' | 'help'

function money(value: number): string {
  const abs = Math.abs(value)
  const digits = abs === 0 || abs >= 1000 ? 0 : 2
  const body = abs.toLocaleString('en-HK', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${value < 0 ? '-' : ''}HK$${body}`
}

function signed(value: number): string {
  const text = money(Math.abs(value))
  if (value > 0.005) return `+${text}`
  if (value < -0.005) return `-${text}`
  return text
}

function changePct(quote: PublicQuote): number | null {
  if (!quote.prevHkd) return null
  return ((quote.hkd - quote.prevHkd) / quote.prevHkd) * 100
}

function loadAccount(): Account {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return freshAccount()
    const data = JSON.parse(raw) as Partial<Account>
    if (typeof data.cash !== 'number' || !Array.isArray(data.positions)) return freshAccount()
    return {
      cash: data.cash,
      positions: data.positions.filter(
        (position) =>
          position &&
          (position.side === 'long' || position.side === 'short') &&
          Number.isFinite(position.qty) &&
          Number.isFinite(position.entry) &&
          Number.isFinite(position.margin),
      ),
      orders: Array.isArray(data.orders) ? data.orders : [],
      fills: Array.isArray(data.fills) ? data.fills : [],
      streak: typeof data.streak === 'number' ? data.streak : 0,
    }
  } catch {
    return freshAccount()
  }
}

function reasonText(error: TradeError): string {
  if (error === 'price') return '而家冇報價，落唔到單。'
  if (error === 'cash') return '可用資金唔夠。'
  if (error === 'size') return '最少落 $100。'
  return '槓桿要喺 1 到 500 倍。'
}

function fillText(fill: Fill, name: string, plain: (value: number) => string, signedFmt: (value: number) => string): string {
  if (fill.action === 'liq') return `${name} 爆倉 ${signedFmt(fill.pnl)}`
  if (fill.action === 'close') return `${name} 平倉 ${signedFmt(fill.pnl)}`
  return `${name} ${fill.side === 'long' ? '開多' : '開空'} ${plain(fill.qty * fill.price)}`
}

function Mark({ kind, down }: { kind: MarketKind; down: boolean }) {
  const ink = down ? 'var(--down)' : 'var(--up)'
  return (
    <svg className="mark" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill={down ? 'rgba(255,77,94,0.16)' : 'rgba(46,229,154,0.16)'} />
      {kind === 'crypto' ? <circle cx="14" cy="14" r="5.5" fill={ink} /> : null}
      {kind === 'index' ? <path d="M7 18h3V11h4v7h3V8h4v10" fill={ink} /> : null}
      {kind === 'stock' ? <path d="M8 18l4-6 3 3 5-8" fill="none" stroke={ink} strokeWidth="2" /> : null}
      {kind === 'future' ? <path d="M14 7l6 5v8H8v-8z" fill={ink} /> : null}
    </svg>
  )
}

function Spark({ candles }: { candles: Candle[] }) {
  const points = candles.slice(-24)
  if (points.length < 2) return <svg className="spark" />
  const min = Math.min(...points.map((candle) => candle.l))
  const max = Math.max(...points.map((candle) => candle.h))
  const span = max - min || 1
  const d = points
    .map((candle, index) => {
      const x = (index / (points.length - 1)) * 72
      const y = 26 - ((candle.c - min) / span) * 24
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const up = points[points.length - 1].c >= points[0].c
  return (
    <svg className="spark" viewBox="0 0 72 28" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? '#3dd68c' : '#ff5c6a'} strokeWidth="1.6" />
    </svg>
  )
}

export function ExchangeApp() {
  const [view, setView] = useState<View>('market')
  const [symbol, setSymbol] = useState('BTC')
  const [feed, setFeed] = useState<Feed | null>(null)
  const [offline, setOffline] = useState(false)
  const [account, setAccount] = useState<Account>(freshAccount)
  const [ready, setReady] = useState(false)
  const [side, setSide] = useState<Side>('long')
  const [mode, setMode] = useState<'market' | 'limit'>('market')
  const [leverage, setLeverage] = useState(5)
  const [highLev, setHighLev] = useState(false)
  const [amount, setAmount] = useState('10000')
  const [limitText, setLimitText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [pulse, setPulse] = useState<'up' | 'down' | ''>('')
  const [ccy, setCcy] = useState<DisplayCcy>('HKD')
  const [nick, setNick] = useState('')
  const [board, setBoard] = useState<BoardRow[]>([])
  const [boardTab, setBoardTab] = useState<'loss' | 'gain' | 'week' | 'steady'>('loss')
  const [underTab, setUnderTab] = useState<'orders' | 'pos'>('pos')
  const [chartOpen, setChartOpen] = useState(false)
  const [authNote, setAuthNote] = useState<string | null>(null)
  const [group, setGroup] = useState<MarketGroup>('hot')
  const [tf, setTf] = useState<Timeframe>('5m')
  const [extraCandles, setExtraCandles] = useState<Candle[] | null>(null)
  const [showMa, setShowMa] = useState(true)
  const [showEma, setShowEma] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [teachOpen, setTeachOpen] = useState(false)
  const [teachStep, setTeachStep] = useState(0)
  const [levGuard, setLevGuard] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [armExit, setArmExit] = useState(false)
  const [tpText, setTpText] = useState('')
  const [slText, setSlText] = useState('')
  const [exits, setExits] = useState<Record<string, { tp: number; sl: number }>>({})
  const [weekPnl, setWeekPnl] = useState(0)
  const [peak, setPeak] = useState(STARTING_HKD)
  const warned = useRef(new Set<number>())
  const auth = useUser()
  const accountRef = useRef(account)
  accountRef.current = account

  useEffect(() => {
    setAccount(loadAccount())
    const saved = localStorage.getItem('si-pan:ccy')
    if (saved === 'USD' || saved === 'HKD') setCcy(saved)
    if (localStorage.getItem('si-pan:high-lev') === '1') setHighLev(true)
    const savedNick = localStorage.getItem('si-pan:nick')
    if (savedNick) setNick(savedNick)
    setTeachOpen(!isTutorialDone(localStorage.getItem(TUTORIAL_KEY)))
    try {
      const savedExits = JSON.parse(localStorage.getItem('si-pan:exits') ?? '{}') as Record<string, { tp: number; sl: number }>
      if (savedExits && typeof savedExits === 'object') setExits(savedExits)
    } catch {
      setExits({})
    }
    setReady(true)
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'error') {
      setAuthNote('Google 登入唔成功，唔該再試過。')
      setView('login')
      params.delete('auth')
      const next = params.toString()
      window.history.replaceState(null, '', next ? `/?${next}` : '/')
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem('si-pan:ccy', ccy)
  }, [ccy, ready])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(SAVE_KEY, JSON.stringify(account))
  }, [account, ready])

  useEffect(() => {
    let stop = false
    const pull = async () => {
      try {
        const response = await fetch('/api/market', { cache: 'no-store' })
        const body = (await response.json()) as Feed
        if (stop) return
        setOffline(false)
        setFeed(body)
        const marks = Object.fromEntries((body.quotes ?? []).map((quote) => [quote.symbol, quote.hkd]))
        const settled = settle(accountRef.current, marks, Boolean(body.ok && !body.stale))
        if (settled.account !== accountRef.current) setAccount(settled.account)
        for (const event of settled.events) {
          const name = marketBySymbol(event.symbol)?.name ?? event.symbol
          if (event.kind === 'liq') setBanner(`爆倉。${name}保證金蝕清，蝕 ${money(Math.abs(event.pnl))}。`)
          else if (event.kind === 'reject') setToast(`${name}到價，但可用資金唔夠。`)
          else setToast(`${name}限價成交。`)
        }
      } catch {
        if (!stop) setOffline(true)
      }
    }
    void pull()
    const timer = window.setInterval(() => void pull(), 8000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [])

  const quote = feed?.quotes.find((item) => item.symbol === symbol) ?? null
  const fx = feed?.fx ?? null
  const show = (hkd: number) => formatDisplay(hkd, ccy, fx)
  const showSigned = (hkd: number) => {
    const shown = toDisplay(hkd, ccy, fx)
    if (shown == null) return '—'
    const text = show(Math.abs(hkd))
    if (shown > 0.005) return `+${text}`
    if (shown < -0.005) return `-${text.replace('-', '')}`
    return text
  }
  const marks = useMemo(() => {
    const book: Record<string, number | null> = {}
    for (const item of feed?.quotes ?? []) book[item.symbol] = item.hkd
    return book
  }, [feed])
  const worth = equity(account, marks)

  useEffect(() => {
    if (view !== 'board') return
    void fetch('/api/board', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { rows?: Array<BoardRow & { peakHkd?: number | null; weekPnlHkd?: number | null }>; me?: { nickname: string } | null }) => {
        if (data.rows) setBoard(data.rows)
        if (data.me?.nickname) setNick((current) => current || data.me!.nickname)
      })
      .catch(() => setBoard([]))
  }, [view])

  useEffect(() => {
    if (!ready || !auth.user || !canPublishRank(auth.user.id)) return
    const nickname = cleanNick(nick)
    if (!nickname) return
    const traded = account.fills.length > 0 || account.positions.length > 0
    const handle = window.setTimeout(() => {
      void fetch('/api/board', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname,
          equityHkd: worth,
          traded,
          displayCcy: ccy,
          peakHkd: Math.max(peak, worth),
          weekPnlHkd: weekPnl,
          weekKey: hongKongWeek(new Date()),
        }),
      })
        .then((response) => response.json())
        .then((data: { note?: string; previous?: number | null }) => {
          if (data.note === 'kept-server' && data.previous != null) {
            say(`雲端記低權益 ${money(data.previous)}。呢部機未玩過，排行榜唔會清走。`)
          } else if (data.previous != null && traded && Math.abs(data.previous - worth) >= 1) {
            if (mergeStanding(worth, traded, data.previous).note === 'local') {
              say(`部機權益 ${money(worth)}，雲端之前 ${money(data.previous)}。排行榜跟你而家呢部機。`)
            }
          }
        })
        .catch(() => undefined)
    }, 800)
    return () => window.clearTimeout(handle)
  }, [auth.user, nick, worth, ccy, ready, account.fills.length, account.positions.length])
  const openPnl = unrealizedTotal(account, marks)
  const closedPnl = realizedPnl(account, marks)
  const line = deskHighlight((feed?.quotes ?? []).map((item) => ({ name: item.name, pct: changePct(item) })))
  const streak = streakLine(account.streak)
  const notional = fromDisplay(Number(amount), ccy, fx)
  const limitPrice = Number(limitText)
  const orderPrice = mode === 'limit' ? limitPrice : quote?.hkd ?? null
  const tradable = Boolean(quote && feed?.ok && !feed.stale && !offline && (quote.kind !== 'crypto' || Date.now() - quote.at < 90_000))
  const previewOk = tradable && notional != null && notional >= MIN_NOTIONAL && orderPrice != null && orderPrice > 0
  const margin = previewOk && orderPrice && notional ? notional / leverage : 0
  const fee = previewOk && notional ? notional * FEE_RATE : 0
  const liq = previewOk && orderPrice ? (side === 'long' ? orderPrice * (1 - 1 / leverage) : orderPrice * (1 + 1 / leverage)) : null
  const clock = quote
    ? new Date(quote.at).toLocaleTimeString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit' })
    : ''

  useEffect(() => {
    if (!quote || limitText) return
    setLimitText(String(Math.round(quote.hkd * 100) / 100))
  }, [quote, limitText])

  useEffect(() => {
    if (tf === '5m') {
      setExtraCandles(null)
      return
    }
    let stop = false
    void fetch(`/api/market?symbol=${encodeURIComponent(symbol)}&tf=${tf}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { candles?: Candle[] }) => {
        if (!stop) setExtraCandles(data.candles ?? [])
      })
      .catch(() => {
        if (!stop) setExtraCandles([])
      })
    return () => {
      stop = true
    }
  }, [symbol, tf])

  useEffect(() => {
    if (!ready) return
    const week = hongKongWeek(new Date())
    const raw = localStorage.getItem('si-pan:week')
    let start = worth
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { key?: string; start?: number }
        if (saved.key === week && typeof saved.start === 'number') start = saved.start
      } catch {
        start = worth
      }
    }
    localStorage.setItem('si-pan:week', JSON.stringify({ key: week, start }))
    setWeekPnl(worth - start)
    const savedPeak = Number(localStorage.getItem('si-pan:peak') ?? '')
    const nextPeak = Math.max(Number.isFinite(savedPeak) ? savedPeak : STARTING_HKD, worth)
    localStorage.setItem('si-pan:peak', String(nextPeak))
    setPeak(nextPeak)
  }, [ready, worth])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  useEffect(() => {
    const previous = Number(sessionStorage.getItem('si-pan:equity') ?? '')
    if (Number.isFinite(previous) && Math.abs(previous - worth) > 0.5) {
      setPulse(worth > previous ? 'up' : 'down')
      const timer = window.setTimeout(() => setPulse(''), 450)
      sessionStorage.setItem('si-pan:equity', String(worth))
      return () => window.clearTimeout(timer)
    }
    sessionStorage.setItem('si-pan:equity', String(worth))
  }, [worth])

  function finishTeach() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setTeachOpen(false)
  }

  function chooseLeverage(value: number) {
    if (value >= 50 && !warned.current.has(value)) {
      setLevGuard(value)
      return
    }
    setLeverage(value)
  }

  function acceptLeverage() {
    if (levGuard == null) return
    warned.current.add(levGuard)
    setLeverage(levGuard)
    setLevGuard(null)
  }

  function say(message: string) {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2200)
  }

  function pick(next: string) {
    setSymbol(next)
    setLimitText('')
    setView('trade')
  }

  function submit(nextSide: Side = side) {
    if (!tradable || quote == null || notional == null) {
      say(notional == null && ccy === 'USD' ? '匯率未到，而家落唔到單。' : offline || feed?.stale ? '報價滯後，而家落唔到單。' : '而家冇報價，落唔到單。')
      return
    }
    if (mode === 'limit') {
      const parked = placeLimit(account, {
        symbol,
        side: nextSide,
        notional,
        leverage,
        price: quote.hkd,
        limit: limitPrice,
      })
      if (!parked.ok) {
        say(reasonText(parked.error))
        return
      }
      setAccount(parked.account)
      say(`掛咗限價${nextSide === 'long' ? '開多' : '開空'} ${quote.name}。`)
      return
    }
    const result = trade(account, { symbol, side: nextSide, notional, leverage, price: quote.hkd })
    if (!result.ok) {
      say(reasonText(result.error))
      return
    }
    setAccount(result.account)
    if (result.fill.action === 'open' && armExit) {
      const tp = fromDisplay(Number(tpText), ccy, fx)
      const sl = fromDisplay(Number(slText), ccy, fx)
      if ((tp != null && tp > 0) || (sl != null && sl > 0)) {
        const next = { ...exits, [symbol]: { tp: tp != null && tp > 0 ? tp : 0, sl: sl != null && sl > 0 ? sl : 0 } }
        setExits(next)
        localStorage.setItem('si-pan:exits', JSON.stringify(next))
      }
    }
    const verb = result.fill.action === 'close' ? '平咗倉' : nextSide === 'long' ? '開咗多' : '開咗空'
    const extra = result.fill.action === 'close' ? showSigned(result.fill.pnl) : `${leverage} 倍`
    say(`${verb}，${quote.name}，${extra}。`)
  }

  function flatten(target: string) {
    const position = account.positions.find((item) => item.symbol === target)
    const mark = marks[target]
    if (!position || mark == null) {
      say('而家冇報價，平唔到倉。')
      return
    }
    const result = trade(account, {
      symbol: target,
      side: position.side === 'long' ? 'short' : 'long',
      notional: position.qty * mark,
      leverage: Math.min(MAX_LEVERAGE, Math.max(1, Math.round(effectiveLeverage(position)))),
      price: mark,
    })
    if (!result.ok) {
      say(reasonText(result.error))
      return
    }
    setAccount(result.account)
    setExits((current) => {
      if (!current[target]) return current
      const next = { ...current }
      delete next[target]
      localStorage.setItem('si-pan:exits', JSON.stringify(next))
      return next
    })
    say(`平咗倉，${marketBySymbol(target)?.name ?? target}，${showSigned(result.fill.pnl)}。`)
  }

  const exitLock = useRef('')

  useEffect(() => {
    const current = accountRef.current
    const position = current.positions.find((item) => {
      const exit = exits[item.symbol]
      const mark = marks[item.symbol]
      if (!exit || mark == null) return false
      const take = exit.tp > 0 && (item.side === 'long' ? mark >= exit.tp : mark <= exit.tp)
      const stop = exit.sl > 0 && (item.side === 'long' ? mark <= exit.sl : mark >= exit.sl)
      return take || stop
    })
    if (!position) return
    const mark = marks[position.symbol]
    if (mark == null) return
    const key = `${position.symbol}:${position.side}`
    if (exitLock.current === key) return
    exitLock.current = key
    const result = trade(current, {
      symbol: position.symbol,
      side: position.side === 'long' ? 'short' : 'long',
      notional: position.qty * mark,
      leverage: Math.min(MAX_LEVERAGE, Math.max(1, Math.round(effectiveLeverage(position)))),
      price: mark,
    })
    if (!result.ok) {
      exitLock.current = ''
      return
    }
    setAccount(result.account)
    setExits((existing) => {
      const next = { ...existing }
      delete next[position.symbol]
      localStorage.setItem('si-pan:exits', JSON.stringify(next))
      return next
    })
    say(`${position.side === 'long' ? '止盈止損平咗多倉' : '止盈止損平咗空倉'}，${marketBySymbol(position.symbol)?.name ?? position.symbol}，${showSigned(result.fill.pnl)}。`)
  }, [marks, exits])

  function reset() {
    const next = freshAccount()
    setAccount(next)
    localStorage.removeItem(SAVE_KEY)
    setResetOpen(false)
    setBanner(null)
    say('返到 100 萬模擬資金。')
  }

  const working = account.orders.find((order) => order.symbol === symbol)

  function boardRows(): { nickname: string; label: string }[] {
    if (boardTab === 'loss') {
      return rankLosses(board).map((row) => ({
        nickname: row.nickname,
        label: `蝕 ${show(Math.max(0, STARTING_HKD - row.equityHkd))}`,
      }))
    }
    if (boardTab === 'gain') {
      return rankGains(board).map((row) => ({ nickname: row.nickname, label: show(row.equityHkd) }))
    }
    const standings: Standing[] = board.flatMap((row) => {
      const extra = row as BoardRow & { peakHkd?: number | null; weekPnlHkd?: number | null }
      if (typeof extra.weekPnlHkd !== 'number') return []
      return [{ nickname: row.nickname, equityHkd: row.equityHkd, peakHkd: extra.peakHkd ?? row.equityHkd, weekPnlHkd: extra.weekPnlHkd }]
    })
    const ranked = boardTab === 'week' ? rankWeekProfit(standings) : rankSteady(standings)
    return ranked.map((row) => ({
      nickname: row.nickname,
      label: boardTab === 'week' ? showSigned(row.weekPnlHkd) : `回撤 ${(drawdown(row) * 100).toFixed(1)}%`,
    }))
  }

  const dayDone = account.fills.some((fill) => fill.action === 'open' && hongKongDay(new Date(fill.at)) === hongKongDay(new Date()))

  return (
    <main className={account.positions.length || account.fills.length ? 'desk' : 'desk shut'}>
      <header className="top">
        <h1>試盤</h1>
        <span className="top-side">
          <button className="text-btn" type="button" onClick={() => setCcy((current) => (current === 'HKD' ? 'USD' : 'HKD'))}>
            {ccy === 'HKD' ? 'HK$' : 'US$'}
          </button>
          <button className="text-btn" type="button" onClick={() => setView('board')}>
            排行榜
          </button>
          <button
            className="text-btn"
            type="button"
            onClick={() => {
              setTeachStep(0)
              setTeachOpen(true)
            }}
          >
            教學
          </button>
          <button className="text-btn" type="button" onClick={() => setView('login')}>
            {auth.user ? nick || '已登入' : '登入'}
          </button>
          <button className="text-btn" type="button" onClick={() => setResetOpen(true)}>
            重新開始
          </button>
          <span className="clock">{clock ? `${clock} 港時` : '等緊報價'}</span>
        </span>
      </header>
      <p className="disclaimer">呢個係模擬盤，用虛擬資金，唔係真錢交易</p>
      {toast ? <p className="toast">{toast}</p> : null}
      <p className="story" aria-live="polite">
        {offline && !feed?.quotes.length ? '報價暫時攞唔到，市況暫停。' : line}
        {streak ? ` ${streak}` : ''}
      </p>
      <div className="tape">
        <div className={`equity ${pulse} ${openPnl > 0 ? 'up' : openPnl < 0 ? 'down' : ''}`}>
          <span>權益</span>
          <strong>{show(worth)}</strong>
        </div>
        <div className="mini-stat">
          <span>可用</span>
          <strong>{show(account.cash)}</strong>
        </div>
        <div className="mini-stat">
          <span>保證金</span>
          <strong>{show(usedMargin(account))}</strong>
        </div>
        <div className="mini-stat">
          <span>未平倉</span>
          <strong className={openPnl > 0 ? 'up' : openPnl < 0 ? 'down' : ''}>{showSigned(openPnl)}</strong>
        </div>
        <div className="mini-stat">
          <span>已實現</span>
          <strong className={closedPnl > 0 ? 'up' : closedPnl < 0 ? 'down' : ''}>{showSigned(closedPnl)}</strong>
        </div>
      </div>
      {banner ? (
        <div className="banner" role="alert">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)}>
            知道
          </button>
        </div>
      ) : null}
      <div className="stage">
        <section className={view === 'market' ? 'pane markets on' : 'pane markets'} aria-label="市況">
          <div className="seg groups">
            {(
              [
                ['hot', '熱門'],
                ['hk', '香港人常玩'],
                ['us', '美股'],
                ['metal', '商品'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={group === id ? 'chip on' : 'chip'} onClick={() => setGroup(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="list">
            {MARKETS.filter((market) => market.groups.includes(group)).map((market) => {
              const item = feed?.quotes.find((quoteRow) => quoteRow.symbol === market.symbol)
              const pct = item ? changePct(item) : null
              return (
                <button key={market.symbol} type="button" className={market.symbol === symbol ? 'row picked' : 'row'} onClick={() => pick(market.symbol)}>
                  <Mark kind={market.kind} down={pct != null && pct < 0} />
                  <span>
                    <b>{market.name}</b>
                    <small>
                      {market.code} · {item ? freshnessLabel(market.feed, item.session, market.kind) : '等報價'}
                    </small>
                  </span>
                  <Spark candles={item?.candles ?? []} />
                  <span>
                    <b>{item ? show(item.hkd) : '—'}</b>
                    <small className={pct != null && pct < 0 ? 'down' : 'up'}>{pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
        <section className={view === 'trade' ? `pane chart-col on${chartOpen ? ' chart-open' : ''}` : 'pane chart-col'} aria-label="圖">
          <h2>
            {quote?.name ?? marketBySymbol(symbol)?.name}{' '}
            <span className={quote && changePct(quote) != null && changePct(quote)! < 0 ? 'down price' : 'up price'}>
              {quote ? show(quote.hkd) : '—'}
            </span>
          </h2>
          <p className="quiet">
            {quote
              ? freshnessLabel(quote.feed, quote.session, quote.kind)
              : tradable
                ? '跟住最新成交價。'
                : '報價滯後，而家落唔到單。'}
            {quote?.feed === 'delayed' ? '。延遲報價，唔好當即時。' : ''}
          </p>
          <div className="seg tf">
            {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((item) => (
              <button key={item} type="button" className={tf === item ? 'chip on' : 'chip'} onClick={() => setTf(item)}>
                {item === '1m' ? '1分' : item === '5m' ? '5分' : item === '15m' ? '15分' : item === '1h' ? '1小時' : item === '4h' ? '4小時' : '日'}
              </button>
            ))}
          </div>
          <div className="seg tf">
            <button type="button" className={showMa ? 'chip on' : 'chip'} onClick={() => setShowMa((on) => !on)}>
              MA
            </button>
            <button type="button" className={showEma ? 'chip on' : 'chip'} onClick={() => setShowEma((on) => !on)}>
              EMA
            </button>
            <button type="button" className={showVolume ? 'chip on' : 'chip'} onClick={() => setShowVolume((on) => !on)}>
              成交量
            </button>
          </div>
          <div className="chart-wrap">
            <CandleChart
              candles={tf === '5m' ? quote?.candles ?? [] : extraCandles ?? []}
              showMa={showMa}
              showEma={showEma}
              showVolume={showVolume}
              limitPrice={mode === 'limit' ? Number(limitText) || null : null}
              onLimit={(price) => {
                setMode('limit')
                setLimitText(String(Math.round(price * 100) / 100))
              }}
            />
          </div>
        </section>
        <section className={view === 'trade' ? 'pane ticket-col on' : 'pane ticket-col'} aria-label="落單">
          <div className="pair">
            <div>
              <b>{quote?.name ?? marketBySymbol(symbol)?.name}</b>
              <span className={quote && changePct(quote) != null && changePct(quote)! < 0 ? 'down' : 'up'}>
                {quote && changePct(quote) != null ? `${changePct(quote)! > 0 ? '+' : ''}${changePct(quote)!.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="pair-tools">
              <span className="pill">逐倉</span>
              <span className="pill">{leverage}倍</span>
            </div>
          </div>
          <div className="levs" aria-label="槓桿">
            {BASE_LEVERAGES.map((value) => (
              <button key={value} type="button" className={leverage === value ? 'lev on' : 'lev'} onClick={() => chooseLeverage(value)}>
                {value}倍
              </button>
            ))}
            {highLev
              ? HIGH_LEVERAGES.map((value) => (
                  <button key={value} type="button" className={leverage === value ? 'lev hot on' : 'lev hot'} onClick={() => chooseLeverage(value)}>
                    {value}倍
                  </button>
                ))
              : (
                  <button
                    type="button"
                    className="lev unlock"
                    onClick={() => {
                      setHighLev(true)
                      localStorage.setItem('si-pan:high-lev', '1')
                    }}
                  >
                    更高
                  </button>
                )}
          </div>
          <p className={leverage >= 50 ? 'quiet warn' : 'quiet'}>{leverageWarning(leverage)}</p>
          <div className="trade-split">
          <form
              className="ticket"
              onSubmit={(event) => {
                event.preventDefault()
                submit(side)
              }}
            >
              <div className="seg">
                <button type="button" className={mode === 'market' ? 'chip on' : 'chip'} onClick={() => setMode('market')}>
                  市價
                </button>
                <button type="button" className={mode === 'limit' ? 'chip on' : 'chip'} onClick={() => setMode('limit')}>
                  限價
                </button>
              </div>
              <label className="field">
                金額（{ccy === 'USD' ? 'US$' : 'HK$'}）
                <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <div className="chips">
                {AMOUNTS.map((value) => (
                  <button key={value} type="button" className={Number(amount) === value ? 'chip on' : 'chip'} onClick={() => setAmount(String(value))}>
                    {value / 10000}萬
                  </button>
                ))}
              </div>
              {mode === 'limit' ? (
                <label className="field">
                  限價（拖條或者拖圖）
                  <input inputMode="decimal" value={limitText} onChange={(event) => setLimitText(event.target.value)} />
                  {quote ? (
                    <input
                      className="slider"
                      type="range"
                      min={quote.hkd * 0.97}
                      max={quote.hkd * 1.03}
                      step={Math.max(quote.hkd * 0.0002, 0.01)}
                      value={Math.min(quote.hkd * 1.03, Math.max(quote.hkd * 0.97, Number(limitText) || quote.hkd))}
                      onChange={(event) => setLimitText(event.target.value)}
                    />
                  ) : null}
                </label>
              ) : null}
              <label className="check">
                <input type="checkbox" checked={armExit} onChange={(event) => setArmExit(event.target.checked)} />
                止盈止損
              </label>
              {armExit ? (
                <div className="exits">
                  <label className="field">
                    止盈
                    <input inputMode="decimal" value={tpText} onChange={(event) => setTpText(event.target.value)} />
                  </label>
                  <label className="field">
                    止損
                    <input inputMode="decimal" value={slText} onChange={(event) => setSlText(event.target.value)} />
                  </label>
                </div>
              ) : null}
              <div className="preview">
                <div>
                  <span>可用</span>
                  <b>{show(account.cash)}</b>
                </div>
                <div>
                  <span>保證金</span>
                  <b>{previewOk ? show(margin) : '—'}</b>
                </div>
                <div>
                  <span>爆倉價</span>
                  <b>{liq != null ? show(liq) : '—'}</b>
                </div>
              </div>
              <button className="go long" type="button" disabled={!tradable} onClick={() => submit('long')}>
                開多
              </button>
              <button className="go short" type="button" disabled={!tradable} onClick={() => submit('short')}>
                開空
              </button>
              {working ? (
                <div className="order-line">
                  <span>
                    限價{working.side === 'long' ? '開多' : '開空'} {show(working.limit)}，未成交
                  </span>
                  <button type="button" onClick={() => setAccount(cancelOrder(account, symbol))}>
                    取消
                  </button>
                </div>
              ) : null}
            </form>
            <aside className="ladder" aria-label="參考盤口">
              <p>參考盤口 <span>唔係真盤</span></p>
              <div className="ladder-head">
                <span>價格</span>
                <span>數量</span>
              </div>
              {quote && referenceLadder(quote.hkd) ? (
                <>
                  {referenceLadder(quote.hkd)!.asks.map((level) => (
                    <button
                      key={`a-${level.price}`}
                      type="button"
                      className="ask"
                      onClick={() => {
                        setMode('limit')
                        setLimitText(String(Math.round(level.price * 100) / 100))
                      }}
                    >
                      <span>{show(level.price)}</span>
                      <span>{level.size}</span>
                    </button>
                  ))}
                  <div className="last">{show(quote.hkd)}</div>
                  {referenceLadder(quote.hkd)!.bids.map((level) => (
                    <button
                      key={`b-${level.price}`}
                      type="button"
                      className="bid"
                      onClick={() => {
                        setMode('limit')
                        setLimitText(String(Math.round(level.price * 100) / 100))
                      }}
                    >
                      <span>{show(level.price)}</span>
                      <span>{level.size}</span>
                    </button>
                  ))}
                  {(() => {
                    const book = referenceLadder(quote.hkd)!
                    const ask = book.asks.reduce((sum, level) => sum + level.size, 0)
                    const bid = book.bids.reduce((sum, level) => sum + level.size, 0)
                    const bidPct = Math.round((bid / (ask + bid || 1)) * 100)
                    return (
                      <div className="ratio" aria-label="參考買賣比例">
                        <span>買 {bidPct}%</span>
                        <i>
                          <b className="bid-bar" style={{ width: `${bidPct}%` }} />
                          <b className="ask-bar" style={{ width: `${100 - bidPct}%` }} />
                        </i>
                        <span>賣 {100 - bidPct}%</span>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <p className="quiet">未有報價</p>
              )}
            </aside>
          </div>
          <div className="under">
            <div className="seg">
              <button type="button" className={underTab === 'orders' ? 'chip on' : 'chip'} onClick={() => setUnderTab('orders')}>
                未成交
              </button>
              <button type="button" className={underTab === 'pos' ? 'chip on' : 'chip'} onClick={() => setUnderTab('pos')}>
                持有倉
              </button>
            </div>
            {underTab === 'orders' ? (
              working ? (
                <p className="quiet">限價{working.side === 'long' ? '開多' : '開空'} {show(working.limit)}</p>
              ) : (
                <p className="quiet">未有掛單。</p>
              )
            ) : account.positions.filter((position) => position.symbol === symbol).length === 0 ? (
              <p className="quiet">呢隻未有倉。</p>
            ) : (
              <p className="quiet">
                {(() => {
                  const position = account.positions.find((item) => item.symbol === symbol)!
                  const mark = quote?.hkd ?? position.entry
                  return `未平倉 ${showSigned(unrealized(position, mark))}（${movePct(position, mark).toFixed(2)}%）· 爆倉價 ${show(liquidationPrice(position))}`
                })()}
              </p>
            )}
          </div>
          <button className="chart-bar" type="button" onClick={() => setChartOpen((open) => !open)}>
            <span>{quote?.name ?? marketBySymbol(symbol)?.name} 圖</span>
            <span>{chartOpen ? '收起' : '展開'}</span>
          </button>
        </section>
        <section className={view === 'book' ? 'pane book-col on' : 'pane book-col'} aria-label="持倉">
          <div className="book">
            <p className="blotter-title">持倉</p>
            {account.positions.length ? (
              <button type="button" className="chip" onClick={() => setShareOpen(true)}>
                分享模擬成績
              </button>
            ) : null}
            {account.positions.length === 0 ? <p>未有持倉。</p> : null}
            {account.positions.map((position) => {
              const mark = marks[position.symbol]
              const pnl = mark == null ? null : unrealized(position, mark)
              const name = marketBySymbol(position.symbol)?.name ?? position.symbol
              return (
                <div key={position.symbol} className="pos">
                  <div className="pos-top">
                    <b>
                      {name} {position.side === 'long' ? '多' : '空'} {Math.max(1, Math.round(effectiveLeverage(position)))}倍
                    </b>
                    <span className="pos-pnl">
                      <small>未平倉</small>
                      <b className={pnl != null && pnl < 0 ? 'down' : 'up'}>{pnl == null ? '未有報價' : showSigned(pnl)}</b>
                    </span>
                    <button type="button" onClick={() => flatten(position.symbol)}>
                      一鍵平倉
                    </button>
                  </div>
                  <div className="pos-meta">
                    <span>
                      平均成本 <b>{show(position.entry)}</b>
                    </span>
                    <span>
                      開倉價 <b>{show(position.firstEntry ?? position.entry)}</b>
                    </span>
                    <span>
                      現價盈虧 <b>{mark == null ? '—' : `${movePct(position, mark).toFixed(2)}%`}</b>
                    </span>
                    <span>
                      未平倉 <b>{pnl == null ? '未有報價' : showSigned(pnl)}</b>
                    </span>
                    <span>
                      爆倉價 <b>{show(liquidationPrice(position))}</b>
                    </span>
                  </div>
                </div>
              )
            })}
            {account.fills.length ? (
              <ul className="fills">
                {account.fills.slice(0, 8).map((fill) => (
                  <li key={fill.id}>
                    <span>{fillText(fill, marketBySymbol(fill.symbol)?.name ?? fill.symbol, show, showSigned)}</span>
                    {tradeRecap(fill) ? <small>{tradeRecap(fill)}</small> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
      {view === 'board' ? (
        <section className="sheet" aria-label="排行榜">
          <div className="seg">
            <button type="button" className={boardTab === 'loss' ? 'chip on' : 'chip'} onClick={() => setBoardTab('loss')}>
              最傷
            </button>
            <button type="button" className={boardTab === 'gain' ? 'chip on' : 'chip'} onClick={() => setBoardTab('gain')}>
              賺最多
            </button>
            <button type="button" className={boardTab === 'week' ? 'chip on' : 'chip'} onClick={() => setBoardTab('week')}>
              本週最賺
            </button>
            <button type="button" className={boardTab === 'steady' ? 'chip on' : 'chip'} onClick={() => setBoardTab('steady')}>
              最穩健
            </button>
            <button type="button" className="chip" onClick={() => setView('market')}>
              返去
            </button>
          </div>
          <p className="quiet">
            模擬資金。今日任務：開一單（{dayDone ? '完成咗' : '未完成'}）。本週你部機 {showSigned(weekPnl)}。要登入先上公眾榜。
          </p>
          {auth.user ? (
            <label className="field">
              花名
              <input
                value={nick}
                maxLength={12}
                onChange={(event) => {
                  setNick(event.target.value)
                  localStorage.setItem('si-pan:nick', event.target.value.trim())
                }}
              />
            </label>
          ) : (
            <button type="button" className="primary" onClick={() => setView('login')}>
              登入先上榜
            </button>
          )}
          <ol className="ranks">
            {boardRows().map((row) => (
              <li key={row.nickname}>
                <span>{row.nickname}</span>
                <span>{row.label}</span>
              </li>
            ))}
          </ol>
          {boardRows().length === 0 ? <p className="quiet">暫時未有人上榜。公眾週榜要資料庫加咗週欄先有數。</p> : null}
          <div className="follow">
            <p>睇人點做</p>
            {DEMO_TRADERS.map((demo) => (
              <div key={demo.id} className="follow-row">
                <span>
                  <b>{demo.name}</b>
                  <small>{demo.note}</small>
                </span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    const pct = quote ? changePct(quote) ?? 0 : 0
                    setSide(demoSide(demo.id, pct))
                    setView('trade')
                    say(`模擬跟單：${demo.name}。你仍然要自己確認，唔係真跟單。`)
                  }}
                >
                  模擬跟單
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {view === 'login' ? (
        <LoginSheet
          initialNote={authNote}
          onClose={() => setView('market')}
          onDone={(name) => {
            if (name) setNick(name)
            setView('board')
          }}
        />
      ) : null}
      <nav className="nav" aria-label="版面">
        <button type="button" className={view === 'market' ? 'on' : ''} onClick={() => setView('market')}>
          市況
        </button>
        <button type="button" className={view === 'trade' ? 'on' : ''} onClick={() => setView('trade')}>
          落單
          {account.orders.length ? <i className="dot" aria-label="有未成交" /> : null}
        </button>
        <button type="button" className={view === 'book' ? 'on' : ''} onClick={() => setView('book')}>
          持倉
          {account.positions.length ? <i className="dot" aria-label="有持倉" /> : null}
        </button>
      </nav>
      {teachOpen ? (
        <div className="modal teach" role="dialog" aria-modal="true" aria-label="教學">
          <div>
            <p className="quiet">第 {teachStep + 1} / {TUTORIAL_STEPS.length} 步 · 大約半分鐘</p>
            <h2>{TUTORIAL_STEPS[teachStep].title}</h2>
            <p>{TUTORIAL_STEPS[teachStep].body}</p>
            <div className="seg">
              <button type="button" className="chip" onClick={finishTeach}>
                跳過
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  finishTeach()
                  setView('help')
                }}
              >
                詞彙
              </button>
              {teachStep < TUTORIAL_STEPS.length - 1 ? (
                <button type="button" className="chip on" onClick={() => setTeachStep((step) => step + 1)}>
                  下一步
                </button>
              ) : (
                <button type="button" className="chip on" onClick={finishTeach}>
                  明白
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {levGuard != null ? (
        <div className="modal teach warn" role="dialog" aria-modal="true" aria-label="高槓桿警告">
          <div>
            <h2>{levGuard} 倍</h2>
            <p>{highLeverageWarning(levGuard)}</p>
            <div className="seg">
              <button type="button" className="chip" onClick={() => setLevGuard(null)}>
                取消
              </button>
              <button type="button" className="chip on" onClick={acceptLeverage}>
                我明，用 {levGuard} 倍
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {shareOpen ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="分享">
          <div className="share-card">
            <p>試盤 · 模擬盤</p>
            <b>{nick || '訪客'}</b>
            <p>{quote?.name ?? '虛擬資金'}</p>
            <strong className={openPnl + closedPnl < 0 ? 'down' : 'up'}>{showSigned(openPnl + closedPnl)}</strong>
            <p>虛擬資金，唔係真錢</p>
            <div className="seg">
              <button type="button" className="chip" onClick={() => setShareOpen(false)}>
                關閉
              </button>
              <button
                type="button"
                className="chip on"
                onClick={() => {
                  const canvas = document.createElement('canvas')
                  canvas.width = 1080
                  canvas.height = 1080
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  ctx.fillStyle = '#10151c'
                  ctx.fillRect(0, 0, 1080, 1080)
                  ctx.fillStyle = '#d5dde6'
                  ctx.font = '42px sans-serif'
                  ctx.fillText('試盤 · 模擬盤', 72, 160)
                  ctx.fillStyle = '#e7edf4'
                  ctx.font = '72px sans-serif'
                  ctx.fillText(nick || '訪客', 72, 280)
                  ctx.font = '48px sans-serif'
                  ctx.fillText(quote?.name ?? '虛擬資金', 72, 380)
                  ctx.fillStyle = openPnl + closedPnl < 0 ? '#ff5c6a' : '#3dd68c'
                  ctx.font = '84px sans-serif'
                  ctx.fillText(showSigned(openPnl + closedPnl), 72, 520)
                  ctx.fillStyle = '#d5dde6'
                  ctx.font = '36px sans-serif'
                  ctx.fillText('虛擬資金，唔係真錢', 72, 640)
                  const link = document.createElement('a')
                  link.href = canvas.toDataURL('image/png')
                  link.download = 'si-pan.png'
                  link.click()
                }}
              >
                儲存圖片
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {view === 'help' ? (
        <section className="sheet" aria-label="詞彙">
          <button type="button" className="chip" onClick={() => setView('market')}>
            返去
          </button>
          {GLOSSARY.map((tip) => (
            <p key={tip.title}>
              <b>{tip.title}</b>
              <span className="quiet">{tip.body}</span>
            </p>
          ))}
        </section>
      ) : null}
      {resetOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div>
            <h2>重新開始？</h2>
            <p>清晒持倉同紀錄，返去 {show(STARTING_HKD)} 模擬資金？</p>
            <div className="seg">
              <button type="button" className="chip" onClick={() => setResetOpen(false)}>
                算
              </button>
              <button type="button" className="chip on" onClick={reset}>
                確定
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function LoginSheet({
  initialNote,
  onClose,
  onDone,
}: {
  initialNote?: string | null
  onClose: () => void
  onDone: (name: string | null) => void
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState<'email' | 'phone' | null>(null)
  const [note, setNote] = useState<string | null>(initialNote ?? null)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setNote('電郵寫錯咗喎')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } })
      if (error) throw error
      setSent('email')
      setNote('六位數字寄咗去你電郵。喺下面填，唔使撳電郵入面個連結。')
    } catch (error) {
      setNote(error instanceof Error ? error.message : '寄唔到')
    } finally {
      setBusy(false)
    }
  }

  const sendPhone = async () => {
    const trimmed = phone.trim()
    if (!trimmed.startsWith('+')) {
      setNote('手機要加國碼，例如 +852。')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ phone: trimmed, options: { channel: 'sms' } })
      if (error) throw error
      setSent('phone')
      setNote('六位數字會以短訊寄出。如果後台未開手機登入，就改用 Google 或者電郵。')
    } catch (error) {
      setNote(error instanceof Error ? `手機登入未開好：${error.message}` : '手機登入未開好')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setNote('填六位數字')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const result = sent === 'phone'
        ? await supabase.auth.verifyOtp({ phone: phone.trim(), token: code.trim(), type: 'sms' })
        : await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
      if (result.error) throw result.error
      onDone(localStorage.getItem('si-pan:nick'))
    } catch (error) {
      setNote(error instanceof Error ? error.message : '驗證唔到')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/confirm` },
      })
      if (error) throw error
    } catch (error) {
      setBusy(false)
      setNote(error instanceof Error ? error.message : 'Google 登入唔到')
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="sheet">
        {note ? <p role="alert">{note}</p> : null}
        <p>登入仲未開得。後台未設定好。</p>
        <button type="button" className="chip" onClick={onClose}>
          返去
        </button>
      </section>
    )
  }

  return (
    <section className="sheet" aria-label="登入">
      {note ? <p role="alert">{note}</p> : null}
      <p>登入之後先上排行榜。訪客照玩到，資金仍然係模擬。</p>
      <button type="button" className="primary" onClick={() => void google()} disabled={busy}>
        用 Google
      </button>
      <label className="field">
        電郵
        <input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" />
      </label>
      <label className="field">
        手機（要後台開短訊）
        <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="+852" />
      </label>
      {sent ? (
        <label className="field">
          六位數字
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} />
        </label>
      ) : null}
      <div className="seg">
        <button type="button" className="chip" onClick={() => void (sent ? verify() : send())} disabled={busy}>
          {sent ? '確認' : '寄去電郵'}
        </button>
        <button type="button" className="chip" onClick={() => void sendPhone()} disabled={busy}>
          寄去手機
        </button>
        <button type="button" className="chip" onClick={onClose}>
          返去
        </button>
      </div>
    </section>
  )
}
