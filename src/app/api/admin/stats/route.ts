import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/admin-auth'

export type AdminDashboardStats = {
  total_users: number
  online_now: number
  today_active: number
  messages_total: number
  messages_today: number
  workouts_total: number
  workouts_today: number
  meals_total: number
  meals_today: number
  plans_total: number
  banned_ips: number
  day_hk: string
  as_of: string
}

function adminClient() {
  const token = process.env.ADMIN_DELETE_TOKEN?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!token || !url || !anon) return null
  return {
    token,
    supabase: createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const ctx = adminClient()
  if (!ctx) {
    return NextResponse.json({ error: '管理員功能未設定' }, { status: 503 })
  }

  const { data, error } = await ctx.supabase.rpc('admin_dashboard_stats', {
    p_token: ctx.token,
  })

  if (error) {
    console.error('admin_dashboard_stats', error.message)
    return NextResponse.json({ error: '讀取數據失敗' }, { status: 500 })
  }

  return NextResponse.json({ stats: data as AdminDashboardStats })
}
