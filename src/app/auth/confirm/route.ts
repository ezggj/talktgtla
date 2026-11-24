import { NextResponse } from 'next/server'
import { completeLogin } from '@/lib/auth/complete-login'
import { createClient } from '@/lib/supabase/server'

async function redirectAfterLogin(request: Request, status: 307 | 303) {
  const supabase = await createClient()
  const location = await completeLogin(request.url, supabase.auth)
  return NextResponse.redirect(location, status)
}

export function GET(request: Request) {
  return redirectAfterLogin(request, 307)
}

export function POST(request: Request) {
  return redirectAfterLogin(request, 303)
}
