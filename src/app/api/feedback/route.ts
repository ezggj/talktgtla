import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'

const CATEGORIES = new Set(['idea', 'bug', 'love', 'other'])

const RATE_BURST = { limit: 2, windowMs: 30_000 } as const
const RATE_WINDOW = { limit: 8, windowMs: 60 * 60_000 } as const

function rateKey(ip: string, guest: string | null): string {
  const raw = `feedback:${ip}|${guest || 'noguest'}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function hashIp(ip: string): string {
  return createHash('sha256').update(`ttl-fb:${ip}`).digest('hex').slice(0, 32)
}

type PostBody = {
  body?: unknown
  category?: unknown
  page?: unknown
  guestId?: unknown
  contact?: unknown
  userId?: unknown
}

export async function POST(req: Request) {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: '暫時收唔到意見，伺服器未設定好' }, { status: 503 })
  }

  let body: PostBody = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const text = String(body.body || '').trim()
  if (text.length < 4 || text.length > 2000) {
    return NextResponse.json({ error: '寫多少少啦（4–2000 字）' }, { status: 400 })
  }

  let category = String(body.category || 'idea').trim()
  if (!CATEGORIES.has(category)) category = 'idea'

  const page = String(body.page || '').trim().slice(0, 120)
  const guestId = String(body.guestId || '').trim().slice(0, 80)
  const contact = String(body.contact || '').trim().slice(0, 120)
  const userIdRaw = body.userId != null ? String(body.userId).trim() : ''
  const userId =
    userIdRaw &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userIdRaw
    )
      ? userIdRaw
      : null

  const ip = clientIpFromRequest(req)
  const key = rateKey(ip, guestId || null)
  const burst = checkRateLimit(`fb-burst:${key}`, RATE_BURST)
  if (!burst.ok) {
    return NextResponse.json(
      { error: `交得太密，約 ${burst.retryAfterSec} 秒後再試`, retryAfterSec: burst.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
    )
  }
  const window = checkRateLimit(`fb-win:${key}`, RATE_WINDOW)
  if (!window.ok) {
    return NextResponse.json(
      { error: `今日交得太多，約 ${window.retryAfterSec} 秒後再試`, retryAfterSec: window.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(window.retryAfterSec) } }
    )
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('submit_feedback', {
    p_body: text,
    p_category: category,
    p_page: page || null,
    p_guest_id: guestId || null,
    p_contact: contact || null,
    p_user_id: userId,
    p_ip_hash: ip !== 'unknown' ? hashIp(ip) : null,
    p_token: token,
  })

  if (error) {
    console.error('submit_feedback', error.message)
    const m = error.message.toLowerCase()
    if (m.includes('unauthorized')) {
      return NextResponse.json({ error: '暫時收唔到意見，伺服器未設定好' }, { status: 503 })
    }
    if (m.includes('invalid_body')) {
      return NextResponse.json({ error: '寫多少少啦（4–2000 字）' }, { status: 400 })
    }
    return NextResponse.json({ error: '交唔到，請再試一次' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data })
}
