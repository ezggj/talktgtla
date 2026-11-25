export const TUTORIAL_KEY = 'si-pan:taught'

export interface TutorialStep {
  title: string
  body: string
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { title: '開多／開空', body: '開多係賭升。開空係賭跌。兩樣都用虛擬資金。' },
  { title: '市價／限價', body: '市價跟住最新價即刻成交。限價等你個價先至成交。' },
  { title: '槓桿', body: '倍數愈大，賺蝕愈快。5 倍即係反向郁 20% 就爆倉。' },
  { title: '爆倉價', body: '價去到呢個位，保證金蝕清，個倉會被平。' },
  { title: '保證金', body: '開倉先鎖一筆虛擬資金。平倉先放返。唔係真錢。' },
]

export function isTutorialDone(stored: string | null): boolean {
  return stored === '1'
}

/** Modal copy from 50x up. Lower levers stay on the quiet line. */
export function highLeverageWarning(leverage: number): string | null {
  if (leverage < 50) return null
  const move = 100 / leverage
  const text = move >= 1 ? move.toFixed(0) : move.toFixed(1)
  return `${leverage} 倍唔係玩吓。反向郁大約 ${text}% 就爆倉，保證金會蝕清。`
}
