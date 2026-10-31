import { NextResponse } from 'next/server'

/** Ambient bots disabled — chat room is humans only. */
export async function POST() {
  return NextResponse.json({ ok: true, skipped: true, reason: 'bots_disabled' })
}
