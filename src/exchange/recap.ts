import { FEE_RATE, type Fill } from './book'

export function tradeRecap(fill: Pick<Fill, 'action' | 'side' | 'qty' | 'price' | 'pnl'>): string | null {
  if (fill.action === 'open' || !(fill.qty > 0)) return null
  if (fill.action === 'liq') return '爆倉：保證金蝕清，呢個倉被平咗。'
  const fee = fill.qty * fill.price * FEE_RATE
  const gross = fill.pnl + fee
  const sign = fill.side === 'long' ? 1 : -1
  const entry = fill.price - gross / (sign * fill.qty)
  if (!Number.isFinite(entry) || entry <= 0) return fill.pnl >= 0 ? '賺咗。' : '蝕咗。'
  const move = ((fill.price - entry) / entry) * 100
  const dir = move > 0.005 ? '升' : move < -0.005 ? '跌' : '冇郁'
  const verb = fill.pnl >= 0 ? '賺咗' : '蝕咗'
  const side = fill.side === 'long' ? '開多' : '開空'
  return `${verb}：${side}之後價${dir} ${Math.abs(move).toFixed(1)}%。`
}

export const GLOSSARY: readonly { title: string; body: string }[] = [
  { title: '點解 5 倍跌 20% 就爆？', body: '逐倉保證金係倉值嘅五分之一。價反向郁 20%，呢筆保證金蝕清。' },
  { title: '100 倍同 500 倍', body: '100 倍大約反向 1% 就爆。500 倍大約 0.2%。唔係玩吓。' },
  { title: '未平倉同爆倉價', body: '未平倉係而家賺定蝕。爆倉價係個倉會被平嘅價。兩個唔係同一樣。' },
  { title: '參考盤口', body: '旁邊嗰條價係用最新報價砌出嚟睇密度，唔係真交易所嘅買賣盤。' },
]
