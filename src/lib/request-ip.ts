/** Extract client IP from Vercel / proxy headers. */
export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real.slice(0, 64)
  const vercel = req.headers.get('x-vercel-forwarded-for')?.trim()
  if (vercel) {
    const first = vercel.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  return 'unknown'
}
