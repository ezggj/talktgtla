import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  FALLBACK_KEY,
  FALLBACK_URL,
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from '@/lib/supabase/env'
import { clientIpFromRequest } from '@/lib/request-ip'

export const EAT_AI_FREE_DAILY_LIMIT = Math.min(
  50,
  Math.max(1, Number(process.env.EAT_AI_FREE_DAILY_LIMIT || 3) || 3)
)

export type EatAiQuota = {
  ok: boolean
  used: number
  limit: number
  remaining: number
  day?: string
}

function anonRpcClient() {
  return createClient(
    isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
    isSupabaseConfigured ? supabaseKey : FALLBACK_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/** Resolve quota subject: auth user > guest cookie/header > IP. */
export async function resolveEatAiSubject(req: Request): Promise<{
  subjectKey: string
  kind: 'user' | 'guest' | 'ip'
}> {
  try {
    const supabase = await createServerSupabase()
    const { data } = await supabase.auth.getUser()
    if (data.user?.id) {
      return { subjectKey: `user:${data.user.id}`, kind: 'user' }
    }
  } catch {
    /* ignore */
  }

  const headerGuest = req.headers.get('x-ttl-guest-id')?.trim()
  let cookieGuest: string | undefined
  try {
    const jar = await cookies()
    cookieGuest = jar.get('ttl_eat_guest')?.value?.trim()
  } catch {
    /* ignore outside request */
  }
  const guest = (headerGuest || cookieGuest || '').slice(0, 80)
  if (guest && guest.length >= 8) {
    return { subjectKey: `guest:${guest}`, kind: 'guest' }
  }

  const ip = clientIpFromRequest(req)
  return { subjectKey: `ip:${ip}`, kind: 'ip' }
}

export async function peekEatAiQuota(subjectKey: string): Promise<EatAiQuota | null> {
  if (!isSupabaseConfigured) return null
  const supabase = anonRpcClient()
  const { data, error } = await supabase.rpc('peek_eat_ai_quota', {
    p_subject_key: subjectKey,
    p_limit: EAT_AI_FREE_DAILY_LIMIT,
  })
  if (error || !data) {
    console.error('[eat-ai-quota peek]', error?.message)
    return null
  }
  const row = data as EatAiQuota
  return {
    ok: Boolean(row.ok),
    used: Number(row.used) || 0,
    limit: Number(row.limit) || EAT_AI_FREE_DAILY_LIMIT,
    remaining: Number(row.remaining) || 0,
    day: row.day ? String(row.day) : undefined,
  }
}

/** Consume one free AI slot. Returns null if RPC unavailable (caller may proceed cautiously). */
export async function consumeEatAiQuota(subjectKey: string): Promise<EatAiQuota | null> {
  if (!isSupabaseConfigured) return null
  const supabase = anonRpcClient()
  const { data, error } = await supabase.rpc('consume_eat_ai_quota', {
    p_subject_key: subjectKey,
    p_limit: EAT_AI_FREE_DAILY_LIMIT,
  })
  if (error || !data) {
    console.error('[eat-ai-quota consume]', error?.message)
    return null
  }
  const row = data as EatAiQuota
  return {
    ok: Boolean(row.ok),
    used: Number(row.used) || 0,
    limit: Number(row.limit) || EAT_AI_FREE_DAILY_LIMIT,
    remaining: Number(row.remaining) || 0,
    day: row.day ? String(row.day) : undefined,
  }
}
