import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  let body: { clientKey?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const clientKey = typeof body.clientKey === 'string' ? body.clientKey.trim() : ''
  if (clientKey.length < 8 || clientKey.length > 80) {
    return NextResponse.json({ error: 'bad_key' }, { status: 400 })
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.rpc('upsert_presence', {
    p_client_key: clientKey,
    p_token: token,
  })
  if (error) {
    console.error('upsert_presence', error.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
