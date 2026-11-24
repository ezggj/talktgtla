export function movingAverage(values: readonly number[], period: number): Array<number | null> {
  if (period < 1) return values.map(() => null)
  return values.map((_, index) => {
    if (index + 1 < period) return null
    let sum = 0
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) sum += values[cursor]
    return sum / period
  })
}

export function exponentialAverage(values: readonly number[], period: number): Array<number | null> {
  if (period < 1) return values.map(() => null)
  const weight = 2 / (period + 1)
  const out: Array<number | null> = []
  let previous: number | null = null
  for (let index = 0; index < values.length; index += 1) {
    if (index + 1 < period) {
      out.push(null)
      continue
    }
    if (previous == null) {
      let sum = 0
      for (let cursor = index - period + 1; cursor <= index; cursor += 1) sum += values[cursor]
      previous = sum / period
    } else {
      previous = values[index] * weight + previous * (1 - weight)
    }
    out.push(previous)
  }
  return out
}
