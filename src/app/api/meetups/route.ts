import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMIT_BURST, RATE_LIMIT_WINDOW } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'
import { MEETUP_FOCUSES } from '@/lib/fitness/meetups'

function rateKey(ip: string, guest: string | null): string {
  const raw = `meetup:${ip}|${guest || 'noguest'}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function mapError(message: string): { status: number; error: string } {
  const m = message.toLowerCase()
  if (m.includes('unauthorized')) return { status: 503, error: '暫時開唔到台，伺服器未設定好' }
  if (m.includes('slot_in_past')) return { status: 400, error: '呢個時段已過——換一個啦' }
  if (m.includes('slot_too_far')) return { status: 400, error: '只可以開兩星期內嘅台' }
  if (m.includes('full')) return { status: 409, error: '呢台已經滿人' }
  if (m.includes('already_joined')) return { status: 409, error: '你已經入咗呢台' }
  if (m.includes('not_found')) return { status: 404, error: '搵唔到呢台' }
  if (m.includes('not_open') || m.includes('expired')) return { status: 409, error: '呢台已經唔再收' }
  return { status: 500, error: '開台失敗，請再試一次' }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    return NextResponse.json({ meetups: [], joins: {} })
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: meetups, error } = await supabase
    .from('gym_meetups')
    .select('*')
    .eq('status', 'open')
    .gt('slot_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString())
    .order('slot_at', { ascending: true })
    .limit(60)

  if (error) {
    console.error('list meetups', error.message)
    return NextResponse.json({ meetups: [], joins: {} })
  }

  const ids = (meetups || []).map((m) => m.id)
  let joins: Record<string, { display_name: string; joined_at: string }[]> = {}
  if (ids.length) {
    const { data: joinRows } = await supabase
      .from('gym_meetup_joins')
      .select('meetup_id, display_name, joined_at')
      .in('meetup_id', ids)
      .order('joined_at', { ascending: true })
    joins = {}
    for (const row of joinRows || []) {
      const list = joins[row.meetup_id] || (joins[row.meetup_id] = [])
      list.push({ display_name: row.display_name, joined_at: row.joined_at })
    }
  }

  return NextResponse.json({ meetups: meetups || [], joins })
}

type PostBody = {
  hostName?: unknown
  gymId?: unknown
  gymName?: unknown
  area?: unknown
  slotAt?: unknown
  focus?: unknown
  note?: unknown
  guestId?: unknown
  userId?: unknown
}

export async function POST(req: Request) {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: '暫時開唔到台，伺服器未設定好' }, { status: 503 })
  }

  let body: PostBody = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const hostName = String(body.hostName || '').trim().slice(0, 24)
  const gymId = String(body.gymId || '').trim().slice(0, 64)
  const gymName = String(body.gymName || '').trim().slice(0, 80)
  const area = String(body.area || '').trim().slice(0, 40)
  const focus = String(body.focus || '').trim().slice(0, 20)
  const note = String(body.note || '').trim().slice(0, 120)
  const guestId = String(body.guestId || '').trim().slice(0, 80)
  const userIdRaw = body.userId != null ? String(body.userId).trim() : ''
  const slotAt = String(body.slotAt || '').trim()

  if (!hostName || hostName.length < 1) {
    return NextResponse.json({ error: '寫低花名先至開台' }, { status: 400 })
  }
  if (!gymId || !gymName || !area) {
    return NextResponse.json({ error: '揀咗健身房同分店未？' }, { status: 400 })
  }
  if (!MEETUP_FOCUSES.includes(focus as (typeof MEETUP_FOCUSES)[number])) {
    return NextResponse.json({ error: '揀一個想練嘅部位' }, { status: 400 })
  }
  const slotDate = new Date(slotAt)
  if (!Number.isFinite(slotDate.getTime())) {
    return NextResponse.json({ error: '時段唔啱' }, { status: 400 })
  }

  const ip = clientIpFromRequest(req)
  const key = rateKey(ip, guestId || null)
  const burst = checkRateLimit(`meetup-burst:${key}`, RATE_LIMIT_BURST)
  if (!burst.ok) {
    return NextResponse.json(
      { error: `開得太密，約 ${burst.retryAfterSec} 秒後再試`, retryAfterSec: burst.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
    )
  }
  const window = checkRateLimit(`meetup-win:${key}`, RATE_LIMIT_WINDOW)
  if (!window.ok) {
    return NextResponse.json(
      { error: `開得太密，約 ${window.retryAfterSec} 秒後再試`, retryAfterSec: window.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(window.retryAfterSec) } }
    )
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('post_gym_meetup', {
    p_host_name: hostName,
    p_gym_id: gymId,
    p_gym_name: gymName,
    p_area: area,
    p_slot_at: slotDate.toISOString(),
    p_focus: focus,
    p_note: note || null,
    p_guest_id: guestId || null,
    p_user_id: userIdRaw || null,
    p_token: token,
  })

  if (error) {
    console.error('post_gym_meetup', error.message)
    const mapped = mapError(error.message || '')
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }

  return NextResponse.json({ ok: true, meetup: data })
}
