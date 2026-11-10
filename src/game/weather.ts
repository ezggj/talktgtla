import { hash2 } from './rng'

export type TyphoonSignal = 0 | 1 | 3 | 8

/**
 * A storm window every few days. The signal climbs and then drops,
 * so 八號 does not stay up forever.
 */
export function typhoonSignal(day: number, seed: number): TyphoonSignal {
  const window = Math.floor(day / 5)
  if (hash2(window, 3, seed + 19) > 0.42) return 0
  const phase = ((day / 5) % 1 + 1) % 1
  if (phase < 0.12) return 1
  if (phase < 0.26) return 3
  if (phase < 0.58) return 8
  if (phase < 0.74) return 3
  if (phase < 0.88) return 1
  return 0
}

export function signalCopy(signal: TyphoonSignal): string | null {
  if (signal === 8) return '掛八號，巴士電車船都停，舖頭收埋。'
  if (signal === 3) return '掛三號，離島船停，風大雨大。'
  if (signal === 1) return '掛一號風球，落雨，船暫時仲開。'
  return null
}

export function shopFactor(signal: TyphoonSignal): number {
  if (signal === 8) return 0.12
  if (signal === 3) return 0.55
  if (signal === 1) return 0.85
  return 1
}
