import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMIT_BURST, RATE_LIMIT_WINDOW } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'

function rateKey(ip: string, guest: string | null): string {
  const raw = `meetup-join:${ip}|${guest || 'noguest'}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function mapError(message: string): { status: number; error: string } {
  const m = message.toLowerCase()
  if (m.includes('unauthorized')) return { status: 503, error: '暫時入唔到台' }
  if (m.includes('full')) return { status: 409, error: '呢台已經滿人' }
  if (m.includes('already_joined')) return { status: 409, error: '你已經入咗呢台' }
  if (m.includes('not_found')) return { status: 404, error: '搵唔到呢台' }
  if (m.includes('not_open') || m.includes('expired')) return { status: 409, error: '呢台已經唔再收' }
  return { status: 500, error: '入台唔到，再試多次' }
}

type Body = {
  displayName?: unknown
  guestId?: unknown
  userId?: unknown
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: '暫時入唔到台' }, { status: 503 })
  }

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: '搵唔到呢台' }, { status: 404 })

  let body: Body = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const displayName = String(body.displayName || '').trim().slice(0, 24)
  const guestId = String(body.guestId || '').trim().slice(0, 80)
  const userIdRaw = body.userId != null ? String(body.userId).trim() : ''
  if (!displayName) {
    return NextResponse.json({ error: '寫低花名先至入台' }, { status: 400 })
  }

  const ip = clientIpFromRequest(req)
  const key = rateKey(ip, guestId || null)
  const burst = checkRateLimit(`meetup-join-burst:${key}`, RATE_LIMIT_BURST)
  if (!burst.ok) {
    return NextResponse.json(
      { error: `入得太密，約 ${burst.retryAfterSec} 秒後再試`, retryAfterSec: burst.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
    )
  }
  const window = checkRateLimit(`meetup-join-win:${key}`, RATE_LIMIT_WINDOW)
  if (!window.ok) {
    return NextResponse.json(
      { error: `入得太密，約 ${window.retryAfterSec} 秒後再試`, retryAfterSec: window.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(window.retryAfterSec) } }
    )
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('join_gym_meetup', {
    p_meetup_id: id,
    p_display_name: displayName,
    p_guest_id: guestId || null,
    p_user_id: userIdRaw || null,
    p_token: token,
  })

  if (error) {
    console.error('join_gym_meetup', error.message)
    const mapped = mapError(error.message || '')
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }

  return NextResponse.json({ ok: true, meetup: data })
}
