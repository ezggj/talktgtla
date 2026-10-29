import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'talktgtla_admin'

const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ''
  )
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

export function createAdminSessionToken(now = Date.now()): string | null {
  if (!sessionSecret() || !process.env.ADMIN_PASSWORD?.trim()) return null
  const exp = String(now + SESSION_TTL_MS)
  const payload = `admin.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || !sessionSecret()) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [role, exp, sig] = parts
  if (role !== 'admin') return false
  const expMs = Number(exp)
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false
  const payload = `${role}.${exp}`
  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim() || ''
  if (!expected || !password) return false
  try {
    const a = Buffer.from(password)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies()
  return verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value)
}

export function adminCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}
