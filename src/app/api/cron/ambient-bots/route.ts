import { NextResponse } from 'next/server'

/** Ambient bots disabled — cron no-ops. */
async function handle() {
  return NextResponse.json({ ok: true, skipped: true, reason: 'bots_disabled' })
}

export async function GET() {
  return handle()
}

export async function POST() {
  return handle()
}
