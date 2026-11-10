/** Deterministic hashes. Same seed always rebuilds the same coast. */

export function hash2(x: number, y: number, seed: number): number {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export function mixHex(a: string, b: string, t: number): string {
  const amount = Math.min(1, Math.max(0, t))
  const pa = hex(a)
  const pb = hex(b)
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * amount))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function hex(color: string): [number, number, number] {
  const h = color.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}
