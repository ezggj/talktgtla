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
import { fromDisplay, toDisplay, type DisplayCcy } from '@/exchange/display'
import { referenceLadder } from '@/exchange/ladder'
import { marketBySymbol } from '@/exchange/markets'
import { leverageWarning, marketLine, streakLine } from '@/exchange/story'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { useUser } from '@/lib/auth/use-user'
import type { Candle } from '@/exchange/yahoo'
import { CandleChart } from './chart'
import './exchange.css'

const SAVE_KEY = 'si-pan:v1'
const LEVERAGES = [1, 5, 10, 20, 50, 100, 500]
const AMOUNTS = [10_000, 50_000, 100_000]

interface PublicQuote {
  symbol: string
  name: string
  code: string
  kind: 'crypto' | 'stock'
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

type View = 'market' | 'trade' | 'book' | 'board' | 'login'

function money(value: number): string {
  const abs = Math.abs(value)
  const digits = abs === 0 || abs >= 1000 ? 0 : 2
  const body = abs.toLocaleString('en-HK', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${value < 0 ? '-' : ''}$${body}`
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

function fillText(fill: Fill, name: string): string {
  if (fill.action === 'liq') return `${name} 爆倉 ${signed(fill.pnl)}`
  if (fill.action === 'close') return `${name} 平倉 ${signed(fill.pnl)}`
  return `${name} ${fill.side === 'long' ? '開多' : '開空'} ${money(fill.qty * fill.price)}`
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
  const [amount, setAmount] = useState('10000')
  const [limitText, setLimitText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [pulse, setPulse] = useState<'up' | 'down' | ''>('')
  const [ccy, setCcy] = useState<DisplayCcy>('HKD')
  const [nick, setNick] = useState('')
  const [board, setBoard] = useState<BoardRow[]>([])
  const [boardTab, setBoardTab] = useState<'loss' | 'gain'>('loss')
  const [underTab, setUnderTab] = useState<'orders' | 'pos'>('pos')
  const [chartOpen, setChartOpen] = useState(false)
  const auth = useUser()
  const accountRef = useRef(account)
  accountRef.current = account

  useEffect(() => {
    setAccount(loadAccount())
    const saved = localStorage.getItem('si-pan:ccy')
    if (saved === 'USD' || saved === 'HKD') setCcy(saved)
    const savedNick = localStorage.getItem('si-pan:nick')
    if (savedNick) setNick(savedNick)
    setReady(true)
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
  const show = (hkd: number) => {
    const shown = toDisplay(hkd, ccy, fx)
    if (shown == null) return ccy === 'USD' ? '匯率未到' : '—'
    const abs = Math.abs(shown)
    const digits = abs === 0 || abs >= 1000 ? 0 : 2
    const body = abs.toLocaleString('en-HK', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    const unit = ccy === 'USD' ? 'US$' : '$'
    return `${shown < 0 ? '-' : ''}${unit}${body}`
  }
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
      .then((data: { rows?: BoardRow[]; me?: { nickname: string } | null }) => {
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
        body: JSON.stringify({ nickname, equityHkd: worth, traded, displayCcy: ccy }),
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
  const line = marketLine((feed?.quotes ?? []).map((item) => ({ name: item.name, pct: changePct(item) })))
  const streak = streakLine(account.streak)
  const notional = fromDisplay(Number(amount), ccy, fx)
  const limitPrice = Number(limitText)
  const orderPrice = mode === 'limit' ? limitPrice : quote?.hkd ?? null
  const tradable = Boolean(quote && feed?.ok && !feed.stale && !offline && (quote.kind === 'stock' || Date.now() - quote.at < 90_000))
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
    const previous = Number(sessionStorage.getItem('si-pan:equity') ?? '')
    if (Number.isFinite(previous) && Math.abs(previous - worth) > 0.5) {
      setPulse(worth > previous ? 'up' : 'down')
      const timer = window.setTimeout(() => setPulse(''), 450)
      sessionStorage.setItem('si-pan:equity', String(worth))
      return () => window.clearTimeout(timer)
    }
    sessionStorage.setItem('si-pan:equity', String(worth))
  }, [worth])

  function say(message: string) {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2200)
  }

  function pick(next: string) {
    setSymbol(next)
    setLimitText('')
    setView('trade')
  }

  function submit() {
    if (!tradable || quote == null || notional == null) {
      say(notional == null && ccy === 'USD' ? '匯率未到，而家落唔到單。' : offline || feed?.stale ? '報價滯後，而家落唔到單。' : '而家冇報價，落唔到單。')
      return
    }
    if (mode === 'limit') {
      const parked = placeLimit(account, {
        symbol,
        side,
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
      say(`掛咗限價${side === 'long' ? '開多' : '開空'} ${quote.name}。`)
      return
    }
    const result = trade(account, { symbol, side, notional, leverage, price: quote.hkd })
    if (!result.ok) {
      say(reasonText(result.error))
      return
    }
    setAccount(result.account)
    const verb = result.fill.action === 'close' ? '平咗倉' : side === 'long' ? '開咗多' : '開咗空'
    const extra = result.fill.action === 'close' ? signed(result.fill.pnl) : `${leverage} 倍`
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
    say(`平咗倉，${marketBySymbol(target)?.name ?? target}，${signed(result.fill.pnl)}。`)
  }

  function reset() {
    const next = freshAccount()
    setAccount(next)
    localStorage.removeItem(SAVE_KEY)
    setResetOpen(false)
    setBanner(null)
    say('返到 100 萬模擬資金。')
  }

  const working = account.orders.find((order) => order.symbol === symbol)

  return (
    <main className={account.positions.length || account.fills.length ? 'desk' : 'desk shut'}>
      <header className="top">
        <h1>試盤</h1>
        <span className="top-side">
          <button className="text-btn" type="button" onClick={() => setCcy((current) => (current === 'HKD' ? 'USD' : 'HKD'))}>
            {ccy === 'HKD' ? '港幣' : '美金'}
          </button>
          <button className="text-btn" type="button" onClick={() => setView('board')}>
            排行榜
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
          <div className="list">
            {(feed?.quotes.length ? feed.quotes : []).map((item) => {
              const pct = changePct(item)
              return (
                <button key={item.symbol} type="button" className={item.symbol === symbol ? 'row picked' : 'row'} onClick={() => pick(item.symbol)}>
                  <span>
                    <b>{item.name}</b>
                    <small>
                      {item.code}
                      {item.session === 'close' ? ' · 收市價' : ''}
                    </small>
                  </span>
                  <Spark candles={item.candles} />
                  <span>
                    <b>{show(item.hkd)}</b>
                    <small className={pct != null && pct < 0 ? 'down' : 'up'}>{pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}</small>
                  </span>
                </button>
              )
            })}
            {!feed?.quotes.length ? <p className="quiet">{offline ? '報價暫時攞唔到。' : '等緊報價。'}</p> : null}
          </div>
        </section>
        <section className={view === 'trade' ? `pane chart-col on${chartOpen ? ' chart-open' : ''}` : 'pane chart-col'} aria-label="圖">
          <h2>
            {quote?.name ?? marketBySymbol(symbol)?.name}{' '}
            <span className={quote && changePct(quote) != null && changePct(quote)! < 0 ? 'down price' : 'up price'}>
              {quote ? show(quote.hkd) : '—'}
            </span>
          </h2>
          <p className="quiet">{quote?.session === 'close' ? '收市價，唔係即時成交價。' : tradable ? '跟住最新成交價。' : '報價滯後，而家落唔到單。'}</p>
          <div className="chart-wrap">
            <CandleChart candles={quote?.candles ?? []} />
          </div>
        </section>
        <section className={view === 'trade' ? 'pane ticket-col on' : 'pane ticket-col'} aria-label="落單">
          <button className="text-btn chart-toggle" type="button" onClick={() => setChartOpen((open) => !open)}>
            {chartOpen ? '收起圖' : '睇圖'}
          </button>
          <div className="trade-split">
          <form
              className="ticket"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <div className="seg">
                <button type="button" className={side === 'long' ? 'side on long' : 'side'} onClick={() => setSide('long')}>
                  開多
                </button>
                <button type="button" className={side === 'short' ? 'side on short' : 'side'} onClick={() => setSide('short')}>
                  開空
                </button>
              </div>
              <div className="seg">
                <button type="button" className={mode === 'market' ? 'chip on' : 'chip'} onClick={() => setMode('market')}>
                  市價
                </button>
                <button type="button" className={mode === 'limit' ? 'chip on' : 'chip'} onClick={() => setMode('limit')}>
                  限價
                </button>
              </div>
              <div className="levs" aria-label="槓桿">
                {LEVERAGES.map((value) => (
                  <button key={value} type="button" className={leverage === value ? 'lev on' : 'lev'} onClick={() => setLeverage(value)}>
                    {value}倍
                  </button>
                ))}
              </div>
              <p className="quiet">{leverageWarning(leverage)}</p>
              <label className="field">
                金額（港元）
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
                  限價
                  <input inputMode="decimal" value={limitText} onChange={(event) => setLimitText(event.target.value)} />
                </label>
              ) : null}
              <div className="preview">
                <div>
                  <span>保證金</span>
                  <b>{previewOk ? show(margin) : '—'}</b>
                </div>
                <div>
                  <span>爆倉價</span>
                  <b>{liq != null ? show(liq) : '—'}</b>
                </div>
                <div>
                  <span>手續費</span>
                  <b>{previewOk ? show(fee) : '—'}</b>
                </div>
              </div>
              <button className="primary" type="submit" disabled={!tradable}>
                {mode === 'limit' ? `掛限價${side === 'long' ? '開多' : '開空'}` : `確認${side === 'long' ? '開多' : '開空'}`}
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
              <p>參考盤口</p>
              {quote && referenceLadder(quote.hkd) ? (
                <>
                  {referenceLadder(quote.hkd)!.asks.map((level) => (
                    <div key={`a-${level.price}`} className="ask">
                      <span>{show(level.price)}</span>
                      <span>{level.size}</span>
                    </div>
                  ))}
                  <div className="last">{show(quote.hkd)}</div>
                  {referenceLadder(quote.hkd)!.bids.map((level) => (
                    <div key={`b-${level.price}`} className="bid">
                      <span>{show(level.price)}</span>
                      <span>{level.size}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="quiet">未有報價</p>
              )}
              <p className="quiet">唔係真盤口</p>
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
                未平倉 {showSigned(unrealized(account.positions.find((position) => position.symbol === symbol)!, quote?.hkd ?? account.positions.find((position) => position.symbol === symbol)!.entry))}
                {' · '}爆倉價 {show(liquidationPrice(account.positions.find((position) => position.symbol === symbol)!))}
              </p>
            )}
          </div>
        </section>
        <section className={view === 'book' ? 'pane book-col on' : 'pane book-col'} aria-label="持倉">
          <div className="book">
            <p className="blotter-title">持倉</p>
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
                      平倉
                    </button>
                  </div>
                  <div className="pos-meta">
                    <span>
                      開倉價 <b>{show(position.entry)}</b>
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
                    <span>{fillText(fill, marketBySymbol(fill.symbol)?.name ?? fill.symbol)}</span>
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
            <button type="button" className="chip" onClick={() => setView('market')}>
              返去
            </button>
          </div>
          <p className="quiet">模擬資金。最傷係對住開波 100 萬港元蝕得最多。要登入先上榜。</p>
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
            {(boardTab === 'loss' ? rankLosses(board) : rankGains(board)).map((row) => (
              <li key={row.nickname}>
                <span>{row.nickname}</span>
                <span>{boardTab === 'loss' ? `蝕 ${show(Math.max(0, 1_000_000 - row.equityHkd))}` : show(row.equityHkd)}</span>
              </li>
            ))}
          </ol>
          {board.length === 0 ? <p className="quiet">暫時未有人上榜。</p> : null}
        </section>
      ) : null}
      {view === 'login' ? (
        <LoginSheet
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
        </button>
        <button type="button" className={view === 'book' ? 'on' : ''} onClick={() => setView('book')}>
          持倉
        </button>
      </nav>
      {resetOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div>
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

function LoginSheet({ onClose, onDone }: { onClose: () => void; onDone: (name: string | null) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [note, setNote] = useState<string | null>(null)
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
      setSent(true)
      setNote('六位數字寄咗去你電郵。喺下面填，唔使撳電郵入面個連結。')
    } catch (error) {
      setNote(error instanceof Error ? error.message : '寄唔到')
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
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      })
      if (error) throw error
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
        <p>登入仲未開得。後台未設定好。</p>
        <button type="button" className="chip" onClick={onClose}>
          返去
        </button>
      </section>
    )
  }

  return (
    <section className="sheet" aria-label="登入">
      <p>登入之後先上排行榜。訪客照玩到，資金仍然係模擬。</p>
      <button type="button" className="primary" onClick={() => void google()} disabled={busy}>
        用 Google
      </button>
      <label className="field">
        電郵
        <input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" />
      </label>
      {sent ? (
        <label className="field">
          六位數字
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} />
        </label>
      ) : null}
      <div className="seg">
        <button type="button" className="chip" onClick={() => void (sent ? verify() : send())} disabled={busy}>
          {sent ? '確認' : '寄六位數字'}
        </button>
        <button type="button" className="chip" onClick={onClose}>
          返去
        </button>
      </div>
      {note ? <p className="quiet">{note}</p> : null}
    </section>
  )
}
