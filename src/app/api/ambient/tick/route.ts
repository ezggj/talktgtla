import { NextResponse } from 'next/server'
import { runAmbientBots } from '@/lib/ambient'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req)
  // Clients may nudge ambient at most once / 45s per IP
  const limited = checkRateLimit(`ambient-tick:${ip}`, {
    limit: 1,
    windowMs: 45_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'tick_rate' },
      { status: 200 }
    )
  }

  const result = await runAmbientBots()
  const status = result.error === 'not_configured' ? 503 : result.ok ? 200 : 500
  return NextResponse.json(result, { status })
}
