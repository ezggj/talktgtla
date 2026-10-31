function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
/** Prefer legacy anon (already on Vercel); fall back to publishable key. */
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  ''

export const supabaseUrl = rawUrl
export const supabaseKey = rawKey
export const isSupabaseConfigured = Boolean(isValidHttpUrl(rawUrl) && rawKey)

export const FALLBACK_URL = 'https://placeholder.supabase.co'
export const FALLBACK_KEY = 'public-anon-key-placeholder'
