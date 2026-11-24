export type MarketKind = 'crypto' | 'stock' | 'index' | 'future'
export type QuoteUnit = 'usd' | 'hkd'
export type FeedPace = 'live' | 'delayed'
export type MarketGroup = 'hot' | 'hk' | 'us' | 'metal'

export interface Market {
  symbol: string
  yahoo: string
  name: string
  code: string
  kind: MarketKind
  /** usd prices are converted with HKD=X. hkd prices are already in Hong Kong dollars or index points. */
  quote: QuoteUnit
  feed: FeedPace
  groups: readonly MarketGroup[]
}

/** Public Yahoo chart symbols. Names are spoken Cantonese, not a broker's brand. */
export const MARKETS: readonly Market[] = [
  { symbol: 'BTC', yahoo: 'BTC-USD', name: '比特幣', code: 'BTC', kind: 'crypto', quote: 'usd', feed: 'live', groups: ['hot'] },
  { symbol: 'ETH', yahoo: 'ETH-USD', name: '以太幣', code: 'ETH', kind: 'crypto', quote: 'usd', feed: 'live', groups: ['hot'] },
  { symbol: 'HSI', yahoo: '^HSI', name: '恆指', code: 'HSI', kind: 'index', quote: 'hkd', feed: 'delayed', groups: ['hot', 'hk'] },
  { symbol: '0700', yahoo: '0700.HK', name: '騰訊', code: '0700', kind: 'stock', quote: 'hkd', feed: 'delayed', groups: ['hot', 'hk'] },
  { symbol: '3690', yahoo: '3690.HK', name: '美團', code: '3690', kind: 'stock', quote: 'hkd', feed: 'delayed', groups: ['hk'] },
  { symbol: '9988', yahoo: '9988.HK', name: '阿里', code: '9988', kind: 'stock', quote: 'hkd', feed: 'delayed', groups: ['hk'] },
  { symbol: 'GOLD', yahoo: 'GC=F', name: '黃金', code: 'GOLD', kind: 'future', quote: 'usd', feed: 'delayed', groups: ['hot', 'metal'] },
  { symbol: 'OIL', yahoo: 'CL=F', name: '原油', code: 'OIL', kind: 'future', quote: 'usd', feed: 'delayed', groups: ['metal'] },
  { symbol: 'AAPL', yahoo: 'AAPL', name: '蘋果', code: 'AAPL', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['us'] },
  { symbol: 'TSLA', yahoo: 'TSLA', name: '特斯拉', code: 'TSLA', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['hot', 'us'] },
  { symbol: 'NVDA', yahoo: 'NVDA', name: '輝達', code: 'NVDA', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['hot', 'us'] },
  { symbol: 'MSFT', yahoo: 'MSFT', name: '微軟', code: 'MSFT', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['us'] },
  { symbol: 'AMZN', yahoo: 'AMZN', name: '亞馬遜', code: 'AMZN', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['us'] },
  { symbol: 'GOOGL', yahoo: 'GOOGL', name: '谷歌', code: 'GOOGL', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['us'] },
  { symbol: 'SPY', yahoo: 'SPY', name: '標普', code: 'SPY', kind: 'stock', quote: 'usd', feed: 'delayed', groups: ['us'] },
]

export const FX_YAHOO = 'HKD=X'

export function marketBySymbol(symbol: string): Market | undefined {
  return MARKETS.find((market) => market.symbol === symbol)
}

export function freshnessLabel(feed: FeedPace, session: 'live' | 'close', kind: MarketKind): string {
  if (feed === 'delayed') return session === 'close' && kind !== 'crypto' ? '收市 · 延遲' : '延遲'
  return session === 'close' ? '報價舊咗' : '即時'
}
