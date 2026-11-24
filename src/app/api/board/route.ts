import { connection, NextResponse } from 'next/server'
import { cleanNick, mergeStanding } from '@/exchange/board'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export async function GET() {
  await connection()
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false, reason: 'config', rows: [] })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('si_pan_board')
    .select('nickname, equity_hkd, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ ok: false, reason: 'read', rows: [] })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let me = null
  if (user) {
    const { data: mine } = await supabase
      .from('si_pan_board')
      .select('nickname, equity_hkd')
      .eq('user_id', user.id)
      .maybeSingle()
    me = mine
  }
  return NextResponse.json({
    ok: true,
    rows: (data ?? []).map((row) => ({
      nickname: row.nickname as string,
      equityHkd: Number(row.equity_hkd),
    })),
    me: me ? { nickname: me.nickname as string, equityHkd: Number(me.equity_hkd) } : null,
  })
}

export async function POST(request: Request) {
  await connection()
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false, reason: 'config' }, { status: 503 })
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'login' }, { status: 401 })
  const body = (await request.json()) as { nickname?: string; equityHkd?: number; traded?: boolean; displayCcy?: string }
  const nick = cleanNick(body.nickname ?? '')
  if (!nick) return NextResponse.json({ ok: false, reason: 'nick' }, { status: 400 })
  if (typeof body.equityHkd !== 'number' || !Number.isFinite(body.equityHkd)) {
    return NextResponse.json({ ok: false, reason: 'equity' }, { status: 400 })
  }
  const { data: existing } = await supabase
    .from('si_pan_board')
    .select('equity_hkd')
    .eq('user_id', user.id)
    .maybeSingle()
  const merged = mergeStanding(body.equityHkd, Boolean(body.traded), existing ? Number(existing.equity_hkd) : null)
  const displayCcy = body.displayCcy === 'USD' ? 'USD' : 'HKD'
  const { error } = await supabase.from('si_pan_board').upsert({
    user_id: user.id,
    nickname: nick,
    equity_hkd: merged.equityHkd,
    display_ccy: displayCcy,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ ok: false, reason: 'write' }, { status: 500 })
  return NextResponse.json({ ok: true, equityHkd: merged.equityHkd, note: merged.note, previous: existing ? Number(existing.equity_hkd) : null })
}
