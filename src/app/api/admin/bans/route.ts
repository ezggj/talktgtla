import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/admin-auth'

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

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }
  const ctx = adminClient()
  if (!ctx) {
    return NextResponse.json({ error: '管理員功能未設定' }, { status: 503 })
  }

  const { data, error } = await ctx.supabase.rpc('admin_list_banned_ips', {
    p_token: ctx.token,
  })
  if (error) {
    console.error('admin_list_banned_ips', error.message)
    return NextResponse.json({ error: '讀取封鎖名單失敗' }, { status: 500 })
  }
  return NextResponse.json({ bans: data ?? [] })
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }
  const ctx = adminClient()
  if (!ctx) {
    return NextResponse.json({ error: '管理員功能未設定' }, { status: 503 })
  }

  let body: {
    ip?: string
    messageId?: number
    reason?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : null

  if (body.messageId != null) {
    const id = Number(body.messageId)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: '訊息 ID 唔啱' }, { status: 400 })
    }
    const { data, error } = await ctx.supabase.rpc('admin_ban_message_ip', {
      p_message_id: id,
      p_token: ctx.token,
      p_reason: reason,
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('ip_unknown')) {
        return NextResponse.json(
          { error: '呢條訊息冇記錄 IP（可能係舊訊息），唔可以封鎖' },
          { status: 400 }
        )
      }
      console.error('admin_ban_message_ip', error.message)
      return NextResponse.json({ error: '封鎖失敗' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, ip: data })
  }

  const ip = typeof body.ip === 'string' ? body.ip.trim() : ''
  if (!ip || ip.length > 64) {
    return NextResponse.json({ error: 'IP 唔啱' }, { status: 400 })
  }

  const { error } = await ctx.supabase.rpc('admin_ban_ip', {
    p_ip: ip,
    p_token: ctx.token,
    p_reason: reason,
    p_source_message_id: null,
  })
  if (error) {
    console.error('admin_ban_ip', error.message)
    return NextResponse.json({ error: '封鎖失敗' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ip })
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }
  const ctx = adminClient()
  if (!ctx) {
    return NextResponse.json({ error: '管理員功能未設定' }, { status: 503 })
  }

  let body: { ip?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const ip = typeof body.ip === 'string' ? body.ip.trim() : ''
  if (!ip) {
    return NextResponse.json({ error: '請提供要解除嘅 IP' }, { status: 400 })
  }

  const { error } = await ctx.supabase.rpc('admin_unban_ip', {
    p_ip: ip,
    p_token: ctx.token,
  })
  if (error) {
    console.error('admin_unban_ip', error.message)
    return NextResponse.json({ error: '解除封鎖失敗' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
