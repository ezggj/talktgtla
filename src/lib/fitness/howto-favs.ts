/** 「我常睇」動作教學收藏 — localStorage. */

const KEY = 'talktgtla-howto-fav-v1'

export function loadHowtoFavs(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string').slice(0, 40)
  } catch {
    return []
  }
}

export function saveHowtoFavs(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 40)))
  } catch {
    /* ignore */
  }
}

export function isHowtoFav(id: string): boolean {
  return loadHowtoFavs().includes(id)
}

export function toggleHowtoFav(id: string): string[] {
  const cur = loadHowtoFavs()
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur.filter((x) => x !== id)]
  saveHowtoFavs(next)
  return next
}
