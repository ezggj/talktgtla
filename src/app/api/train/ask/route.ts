import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/request-ip'
import { hkDayKey } from '@/lib/fitness/hk-day'
import { buildAskStub, tipForAsk } from '@/lib/fitness/train-tips'
import {
  nextTrainAiCount,
  parseTrainAiCookie,
  serverTrainAiLimit,
  trainAiLimitCopy,
} from '@/lib/fitness/train-ai-quota'

/**
 * Explicit 「問 AI」 only.
 * First ship is rules / heuristics — this route does not import or call a model.
 * Logging a set never hits this endpoint. Free accounts: TRAIN_AI_FREE_DAILY_LIMIT
 * (default 3) per Asia/Hong_Kong day, counted in an httpOnly cookie.
 */

const COOKIE = 'ttl_train_ask'
const snapshot = z.object({
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(0).max(100),
  outcome: z.enum(['ok', 'fail', 'half']).optional(),
})

const bodySchema = z.object({
  kind: z.enum(['open', 'between']),
  exerciseId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  recent: z.array(snapshot).max(3),
  today: z.array(snapshot).max(12),
})

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req)
  const burst = checkRateLimit(`train-ask:${ip}`, { limit: 10, windowMs: 60_000 })
  if (!burst.ok) {
    return NextResponse.json(
      { ok: false, code: 'rate', message: '問得太密，等一陣先再問。' },
      { status: 429 }
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: '唔睇得明呢個請求' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: '資料唔齊，問唔到。' }, { status: 400 })
  }

  const limit = serverTrainAiLimit()
  const day = hkDayKey()
  const used = parseTrainAiCookie(readCookie(req, COOKIE), day)
  const step = nextTrainAiCount(used, limit)
  if (!step.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: 'free_limit',
        source: 'rules',
        message: trainAiLimitCopy(limit),
        day,
        used,
        limit,
        remaining: 0,
      },
      { status: 429 }
    )
  }

  const { kind, exerciseId, name, recent, today } = parsed.data
  if (kind === 'between' && today.length === 0) {
    return NextResponse.json({ ok: false, message: '未有呢組紀錄，問唔到。' }, { status: 400 })
  }

  const tip = tipForAsk({ kind, exerciseId, name, recent, today })
  const line = buildAskStub(tip, name)
  const res = NextResponse.json({
    ok: true,
    source: 'rules',
    line,
    day,
    used: step.used,
    limit,
    remaining: step.remaining,
  })
  res.cookies.set(COOKIE, `${day}:${step.used}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 40,
  })
  return res
}
