import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  verifyAdminPassword,
} from '@/lib/admin-auth'

export async function POST(req: Request) {
  let body: { password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!process.env.ADMIN_PASSWORD?.trim()) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
  }

  if (!verifyAdminPassword(body.password || '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = createAdminSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(60 * 60 * 12))
  return res
}
