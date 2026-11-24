export interface Market {
  symbol: string
  yahoo: string
  name: string
  code: string
  kind: 'crypto' | 'stock'
}

/** Public Yahoo chart symbols. Names are spoken Cantonese, not a broker's brand. */
export const MARKETS: readonly Market[] = [
  { symbol: 'BTC', yahoo: 'BTC-USD', name: '比特幣', code: 'BTC', kind: 'crypto' },
  { symbol: 'ETH', yahoo: 'ETH-USD', name: '以太幣', code: 'ETH', kind: 'crypto' },
  { symbol: 'AAPL', yahoo: 'AAPL', name: '蘋果', code: 'AAPL', kind: 'stock' },
  { symbol: 'TSLA', yahoo: 'TSLA', name: '特斯拉', code: 'TSLA', kind: 'stock' },
  { symbol: 'NVDA', yahoo: 'NVDA', name: '輝達', code: 'NVDA', kind: 'stock' },
  { symbol: 'MSFT', yahoo: 'MSFT', name: '微軟', code: 'MSFT', kind: 'stock' },
  { symbol: 'AMZN', yahoo: 'AMZN', name: '亞馬遜', code: 'AMZN', kind: 'stock' },
  { symbol: 'GOOGL', yahoo: 'GOOGL', name: '谷歌', code: 'GOOGL', kind: 'stock' },
  { symbol: 'SPY', yahoo: 'SPY', name: '標普', code: 'SPY', kind: 'stock' },
]

export const FX_YAHOO = 'HKD=X'

export function marketBySymbol(symbol: string): Market | undefined {
  return MARKETS.find((market) => market.symbol === symbol)
}
