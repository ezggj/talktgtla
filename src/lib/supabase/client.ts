import { createBrowserClient } from '@supabase/ssr'
import {
  FALLBACK_KEY,
  FALLBACK_URL,
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from './env'

export function createClient() {
  return createBrowserClient(
    isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
    isSupabaseConfigured ? supabaseKey : FALLBACK_KEY
  )
}
