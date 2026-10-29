import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

/** True when real Supabase env vars are set (not just build placeholders). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Placeholders let `next build` prerender without credentials.
// Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel for real chat.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key-placeholder'
)
