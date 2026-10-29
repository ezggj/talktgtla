import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

/** True only when URL is a real http(s) URL and anon key is present. */
export const isSupabaseConfigured = Boolean(isValidHttpUrl(rawUrl) && rawKey)

const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'public-anon-key-placeholder'

// Always use a valid URL so `next build` prerender never throws.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl : FALLBACK_URL,
  isSupabaseConfigured ? rawKey : FALLBACK_KEY
)
