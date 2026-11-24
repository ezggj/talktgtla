import { connection, NextResponse } from 'next/server'
import { cleanNick, mergeStanding } from '@/exchange/board'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export async function GET() {
  await connection()
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false, reason: 'config', rows: [] })
  const supabase = await createClient()
  const extended = await supabase
    .from('si_pan_board')
    .select('nickname, equity_hkd, peak_hkd, week_pnl_hkd, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
  const fallback = extended.error
    ? await supabase.from('si_pan_board').select('nickname, equity_hkd, updated_at').order('updated_at', { ascending: false }).limit(50)
    : null
  const data = extended.error ? fallback?.data : extended.data
  const error = extended.error ? fallback?.error : null
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
      peakHkd: 'peak_hkd' in row && row.peak_hkd != null ? Number(row.peak_hkd) : null,
      weekPnlHkd: 'week_pnl_hkd' in row && row.week_pnl_hkd != null ? Number(row.week_pnl_hkd) : null,
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
  const body = (await request.json()) as {
    nickname?: string
    equityHkd?: number
    traded?: boolean
    displayCcy?: string
    peakHkd?: number
    weekPnlHkd?: number
    weekKey?: string
  }
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
  const base = {
    user_id: user.id,
    nickname: nick,
    equity_hkd: merged.equityHkd,
    display_ccy: displayCcy,
    updated_at: new Date().toISOString(),
  }
  const extra = {
    ...base,
    peak_hkd: typeof body.peakHkd === 'number' ? body.peakHkd : merged.equityHkd,
    week_pnl_hkd: typeof body.weekPnlHkd === 'number' ? body.weekPnlHkd : 0,
    week_key: typeof body.weekKey === 'string' ? body.weekKey.slice(0, 10) : null,
  }
  let { error } = await supabase.from('si_pan_board').upsert(extra)
  if (error) {
    const retry = await supabase.from('si_pan_board').upsert(base)
    error = retry.error
  }
  if (error) return NextResponse.json({ ok: false, reason: 'write' }, { status: 500 })
  return NextResponse.json({ ok: true, equityHkd: merged.equityHkd, note: merged.note, previous: existing ? Number(existing.equity_hkd) : null })
}
