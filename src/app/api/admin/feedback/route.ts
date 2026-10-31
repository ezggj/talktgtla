import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/admin-auth'

const STATUSES = new Set(['new', 'seen', 'done', 'wont'])

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

export async function GET(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cfg = adminClient()
  if (!cfg) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const statusRaw = searchParams.get('status')?.trim() || null
  const status = statusRaw && STATUSES.has(statusRaw) ? statusRaw : null

  const { data, error } = await cfg.supabase.rpc('list_feedback', {
    p_token: cfg.token,
    p_status: status,
    p_limit: 100,
  })

  if (error) {
    console.error('list_feedback', error.message)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  return NextResponse.json({ feedback: data || [] })
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cfg = adminClient()
  if (!cfg) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
  }

  let body: { id?: unknown; status?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const id = String(body.id || '').trim()
  const status = String(body.status || '').trim()
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const { data, error } = await cfg.supabase.rpc('update_feedback_status', {
    p_id: id,
    p_status: status,
    p_token: cfg.token,
  })

  if (error) {
    console.error('update_feedback_status', error.message)
    const m = error.message.toLowerCase()
    if (m.includes('not_found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, feedback: data })
}
