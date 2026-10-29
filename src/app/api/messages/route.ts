import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_CONTENT_LENGTH,
  MAX_USERNAME_LENGTH,
  sanitizeContent,
  sanitizeUsername,
} from '@/lib/sanitize'
import {
  RATE_LIMIT_BURST,
  RATE_LIMIT_WINDOW,
  checkRateLimit,
} from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'
import { isAdminRequest } from '@/lib/admin-auth'


type Body = {
  username?: unknown
  content?: unknown
  reply_to?: unknown
  anonymous?: unknown
}

function rateKey(ip: string, fingerprint: string | null): string {
  const raw = `${ip}|${fingerprint || 'nofp'}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function mapRpcError(message: string): { status: number; error: string } {
  const m = message.toLowerCase()
  if (m.includes('ip_banned') || m.includes('banned')) {
    return {
      status: 403,
      error: '你嘅 IP 已被封鎖，暫時唔可以發言。如有誤會請聯絡管理員。',
    }
  }
  if (m.includes('rate_limited')) {
    return {
      status: 429,
      error: '你傾得太密喇，休息一陣再講啦～',
    }
  }
  if (m.includes('unauthorized')) {
    return { status: 503, error: '暫時傳送唔到，請稍後再試' }
  }
  if (m.includes('invalid_username')) {
    return { status: 400, error: '暱稱唔妥當' }
  }
  if (m.includes('invalid_content')) {
    return { status: 400, error: '訊息唔妥當' }
  }
  return { status: 500, error: '傳送失敗，請再試一次' }
}

export async function POST(req: Request) {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) {
    return NextResponse.json({ error: '暫時傳送唔到，伺服器未設定好' }, { status: 503 })
  }

  let body: Body = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯咗' }, { status: 400 })
  }

  const isAnonymous = body.anonymous !== false && body.anonymous !== 'false'
  let username = '匿名'
  if (!isAnonymous) {
    const u = sanitizeUsername(body.username)
    if (!u.ok) {
      return NextResponse.json({ error: u.error }, { status: 400 })
    }
    username = u.value
  }

  const contentResult = sanitizeContent(body.content)
  if (!contentResult.ok) {
    return NextResponse.json({ error: contentResult.error }, { status: 400 })
  }

  let replyTo: number | null = null
  if (body.reply_to != null && body.reply_to !== '') {
    const n = Number(body.reply_to)
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      return NextResponse.json({ error: '回覆對象唔啱' }, { status: 400 })
    }
    replyTo = n
  }

  const ip = clientIpFromRequest(req)
  const fp = req.headers.get('x-client-fingerprint')?.trim() || null
  const key = rateKey(ip, fp)
  const asAdmin = await isAdminRequest()

  // Force a clear admin display name when moderating account posts
  if (asAdmin) {
    if (isAnonymous || username === '匿名') {
      username = '管理員'
    }
  }

  if (!asAdmin) {
  const burst = checkRateLimit(`burst:${key}`, RATE_LIMIT_BURST)
  if (!burst.ok) {
    return NextResponse.json(
      {
        error: `你打得太快喇，等 ${burst.retryAfterSec} 秒再開波～`,
        retryAfterSec: burst.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(burst.retryAfterSec) },
      }
    )
  }

  const window = checkRateLimit(`win:${key}`, RATE_LIMIT_WINDOW)
  if (!window.ok) {
    return NextResponse.json(
      {
        error: `你傾得太密喇，大約 ${window.retryAfterSec} 秒後再講啦～`,
        retryAfterSec: window.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(window.retryAfterSec) },
      }
    )
  }
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('post_message', {
    p_username: username,
    p_content: contentResult.value,
    p_reply_to: replyTo,
    p_token: token,
    p_rate_key: asAdmin ? null : key,
    p_client_ip: ip === 'unknown' ? null : ip,
    p_is_admin: asAdmin,
  })

  if (error) {
    console.error('post_message failed', error.message)
    const mapped = mapRpcError(error.message || '')
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }

  return NextResponse.json({
    ok: true,
    message: data,
    limits: {
      maxContent: MAX_CONTENT_LENGTH,
      maxUsername: MAX_USERNAME_LENGTH,
    },
  })
}
