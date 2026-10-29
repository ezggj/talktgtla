import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { id?: number; banIp?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const id = Number(body.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let bannedIp: string | null = null
  if (body.banIp) {
    const { data, error: banErr } = await supabase.rpc('admin_ban_message_ip', {
      p_message_id: id,
      p_token: token,
      p_reason: '刪除訊息時一併封鎖',
    })
    if (banErr) {
      const msg = banErr.message.toLowerCase()
      if (!msg.includes('ip_unknown')) {
        console.error('ban before delete failed', banErr.message)
        return NextResponse.json({ error: 'ban_failed' }, { status: 500 })
      }
    } else if (typeof data === 'string') {
      bannedIp = data
    }
  }

  const { error } = await supabase.rpc('admin_delete_message', {
    p_id: id,
    p_token: token,
  })

  if (error) {
    console.error('admin_delete_message failed', error.message)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bannedIp })
}
