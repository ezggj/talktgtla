'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export type AuthState = {
  ready: boolean
  user: User | null
  session: Session | null
  configured: boolean
}

export function useUser() {
  const [state, setState] = useState<AuthState>({
    ready: false,
    user: null,
    session: null,
    configured: isSupabaseConfigured,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, ready: true, configured: false }))
      return
    }
    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setState({
        ready: true,
        user: data.session?.user ?? null,
        session: data.session ?? null,
        configured: true,
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setState({
        ready: true,
        user: session?.user ?? null,
        session,
        configured: true,
      })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [])

  return { ...state, signOut }
}

/** Always production origin for magic-link emails (never localhost / preview). */
export function authRedirectTo() {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://talktgtla.com'
  return `${site}/auth/confirm`
}
