import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  FALLBACK_KEY,
  FALLBACK_URL,
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from './env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
    isSupabaseConfigured ? supabaseKey : FALLBACK_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — proxy refreshes the session.
          }
        },
      },
    }
  )
}
