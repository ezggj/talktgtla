import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  BOT_MARKER,
  BOT_REPLIES,
  isBotUsername,
  pick,
  pickPersona,
} from '@/lib/bots'

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

function adminClient() {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) return null
  return {
    token,
    supabase: createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

type Msg = {
  id: number
  username: string
  content: string
  created_at: string
  reply_to: number | null
  is_admin?: boolean
}

async function runAmbient() {
  const ctx = adminClient()
  if (!ctx) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const { data: humansOnline, error: presenceErr } = await ctx.supabase.rpc(
    'count_recent_presence',
    { p_token: ctx.token, p_within_seconds: 90 }
  )
  if (presenceErr) {
    console.error('count_recent_presence', presenceErr.message)
  }
  const online = typeof humansOnline === 'number' ? humansOnline : 0

  // Dial down / pause when real users are around
  // 0 online → active ambient; 1 → light; 2+ → pause
  if (online >= 2) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'humans_online',
      online,
    })
  }

  const { data: recent, error: recentErr } = await ctx.supabase
    .from('messages')
    .select('id,username,content,created_at,reply_to,is_admin')
    .order('created_at', { ascending: false })
    .limit(40)

  if (recentErr) {
    console.error('load recent', recentErr.message)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }

  const msgs = (recent || []) as Msg[]
  const now = Date.now()
  const recentBots = msgs.filter(
    (m) => isBotUsername(m.username) && now - new Date(m.created_at).getTime() < 3 * 60_000
  )
  const recentHumans = msgs.filter(
    (m) =>
      !isBotUsername(m.username) &&
      now - new Date(m.created_at).getTime() < 5 * 60_000
  )

  // Also pause if humans just typed a lot (even if presence lag)
  if (recentHumans.length >= 3) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'human_activity',
      online,
      recentHumans: recentHumans.length,
    })
  }

  // Don't flood: at most ~4 bot msgs / 3 min when empty; 1 when 1 human
  const maxRecentBots = online === 0 ? 4 : 1
  if (recentBots.length >= maxRecentBots) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'bot_throttle',
      online,
      recentBots: recentBots.length,
    })
  }

  const last = msgs[0]
  const lastIsBot = last ? isBotUsername(last.username) : false
  const replyChance = lastIsBot ? 0.55 : 0.2
  const shouldReply = last && Math.random() < replyChance

  const exclude =
    shouldReply && lastIsBot
      ? last!.username.replace(BOT_MARKER, '').trim()
      : undefined
  const persona = pickPersona(exclude)
  const content = shouldReply && lastIsBot ? pick(BOT_REPLIES) : pick(persona.lines)
  const replyTo = shouldReply && last ? last.id : null

  const { data, error } = await ctx.supabase.rpc('post_bot_message', {
    p_username: persona.name,
    p_content: content,
    p_reply_to: replyTo,
    p_token: ctx.token,
  })

  if (error) {
    console.error('post_bot_message', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Sometimes fire a second beat when room is empty
  let second: unknown = null
  if (online === 0 && Math.random() < 0.35 && recentBots.length + 1 < maxRecentBots) {
    const other = pickPersona(persona.name)
    const { data: d2, error: e2 } = await ctx.supabase.rpc('post_bot_message', {
      p_username: other.name,
      p_content: pick(BOT_REPLIES),
      p_reply_to: (data as Msg | null)?.id ?? null,
      p_token: ctx.token,
    })
    if (!e2) second = d2
  }

  return NextResponse.json({
    ok: true,
    online,
    posted: data,
    second,
  })
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return runAmbient()
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return runAmbient()
}
