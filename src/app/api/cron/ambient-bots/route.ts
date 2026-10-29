import { NextResponse } from 'next/server'
import { runAmbientBots } from '@/lib/ambient'

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runAmbientBots()
  const status = result.error === 'not_configured' ? 503 : result.ok ? 200 : 500
  return NextResponse.json(result, { status })
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
