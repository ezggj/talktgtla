/** 公開訓練牆（本機 stub）— 可關；分享連結帶一週摘要 snapshot。 */

import { buildWeeklySummary } from './weekly-summary'
import { loadGoals, loadMeals, loadSessions } from './storage'

const ENABLED_KEY = 'talktgtla-public-wall-enabled-v1'
const SLUG_KEY = 'talktgtla-public-wall-slug-v1'
const SNAP_KEY = 'talktgtla-public-wall-snap-v1'

export type PublicWallSnapshot = {
  v: 1
  slug: string
  displayName: string
  updatedAt: string
  title: string
  lines: string[]
  trainedDays: number
  sessions: number
  volume: number
  proteinAvg: number
  kcalAvg: number
  vibe: string
}

function randomSlug() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = 'w'
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

export function isPublicWallEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function setPublicWallEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0')
    if (on) {
      ensurePublicWallSlug()
      refreshPublicWallSnapshot()
    }
  } catch {
    /* ignore */
  }
}

export function getPublicWallSlug(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(SLUG_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function ensurePublicWallSlug(): string {
  let slug = getPublicWallSlug()
  if (slug) return slug
  slug = randomSlug()
  try {
    localStorage.setItem(SLUG_KEY, slug)
  } catch {
    /* ignore */
  }
  return slug
}

export function rotatePublicWallSlug(): string {
  const slug = randomSlug()
  try {
    localStorage.setItem(SLUG_KEY, slug)
    refreshPublicWallSnapshot()
  } catch {
    /* ignore */
  }
  return slug
}

export function buildLocalPublicWallSnapshot(displayName = '街坊'): PublicWallSnapshot {
  const sessions = loadSessions()
  const meals = loadMeals()
  const goals = loadGoals()
  const s = buildWeeklySummary(sessions, meals, goals.proteinG)
  const slug = ensurePublicWallSlug()
  return {
    v: 1,
    slug,
    displayName: displayName.trim().slice(0, 24) || '街坊',
    updatedAt: new Date().toISOString(),
    title: s.title,
    lines: s.lines,
    trainedDays: s.trainedDays,
    sessions: s.sessions,
    volume: Math.round(s.volume),
    proteinAvg: s.proteinAvg,
    kcalAvg: s.kcalAvg,
    vibe: s.vibe,
  }
}

export function refreshPublicWallSnapshot(displayName?: string): PublicWallSnapshot {
  const snap = buildLocalPublicWallSnapshot(displayName)
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap))
  } catch {
    /* ignore */
  }
  return snap
}

export function loadPublicWallSnapshot(): PublicWallSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PublicWallSnapshot
    if (!parsed || parsed.v !== 1 || !parsed.slug) return null
    return parsed
  } catch {
    return null
  }
}

/** Encode snapshot for share URL (?s=) — no backend. */
export function encodeWallSnapshot(snap: PublicWallSnapshot): string {
  const json = JSON.stringify(snap)
  const b64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeWallSnapshot(token: string): PublicWallSnapshot | null {
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4))
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + pad
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as PublicWallSnapshot
    if (!parsed || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function publicWallPath(slug: string, snap?: PublicWallSnapshot): string {
  const base = `/wall/${encodeURIComponent(slug)}`
  if (!snap) return base
  return `${base}?s=${encodeWallSnapshot(snap)}`
}

export function absolutePublicWallUrl(slug: string, snap?: PublicWallSnapshot): string {
  const path = publicWallPath(slug, snap)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`
  }
  return `https://talktgtla.com${path}`
}
