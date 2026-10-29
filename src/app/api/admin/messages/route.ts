import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { id?: number } = {}
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

  const { error } = await supabase.rpc('admin_delete_message', {
    p_id: id,
    p_token: token,
  })

  if (error) {
    console.error('admin_delete_message failed', error.message)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
