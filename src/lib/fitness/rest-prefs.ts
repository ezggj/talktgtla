/** Last rest duration + whether logging a set auto-starts the countdown. */

const KEY = 'talktgtla-rest-prefs-v1'

export type RestPrefs = {
  seconds: number
  autoStart: boolean
}

const DEFAULTS: RestPrefs = { seconds: 90, autoStart: true }

export function clampRestSeconds(n: number) {
  if (!Number.isFinite(n)) return DEFAULTS.seconds
  return Math.max(15, Math.min(300, Math.round(n)))
}

export function loadRestPrefs(): RestPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<RestPrefs>
    return {
      seconds: clampRestSeconds(Number(parsed.seconds ?? DEFAULTS.seconds)),
      autoStart: parsed.autoStart !== false,
    }
  } catch {
    return DEFAULTS
  }
}

export function saveRestPrefs(patch: Partial<RestPrefs>): RestPrefs {
  const cur = loadRestPrefs()
  const next: RestPrefs = {
    seconds: patch.seconds != null ? clampRestSeconds(patch.seconds) : cur.seconds,
    autoStart: patch.autoStart != null ? patch.autoStart : cur.autoStart,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}
