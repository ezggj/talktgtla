export type ThemeMode = 'light' | 'dark'
/** User preference: follow OS, or force light/dark */
export type ThemePreference = 'system' | 'light' | 'dark'

/** 風格色 — 每種有 light／dark accent */
export type AccentId = 'teal' | 'pink' | 'green' | 'blue' | 'ink'

export const THEME_KEY = 'talktgtla-theme'
export const THEME_PREF_KEY = 'talktgtla-theme-pref'
export const ACCENT_KEY = 'talktgtla-accent'

export const ACCENT_OPTIONS: {
  id: AccentId
  label: string
  /** swatch shown in picker (light accent) */
  swatch: string
}[] = [
  { id: 'teal', label: '青', swatch: '#0F766E' },
  { id: 'pink', label: '粉紅', swatch: '#DB2777' },
  { id: 'green', label: '綠', swatch: '#16A34A' },
  { id: 'blue', label: '藍', swatch: '#2563EB' },
  { id: 'ink', label: '墨', swatch: '#1C1917' },
]

export function readStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return null
}

export function readThemePreference(): ThemePreference {
  try {
    const pref = localStorage.getItem(THEME_PREF_KEY)
    if (pref === 'system' || pref === 'light' || pref === 'dark') return pref
    const legacy = localStorage.getItem(THEME_KEY)
    if (legacy === 'light' || legacy === 'dark') return legacy
  } catch {
    /* ignore */
  }
  return 'system'
}

export function readAccent(): AccentId {
  try {
    const v = localStorage.getItem(ACCENT_KEY)
    if (v === 'teal' || v === 'pink' || v === 'green' || v === 'blue' || v === 'ink') return v
  } catch {
    /* ignore */
  }
  return 'teal'
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function resolveTheme(pref: ThemePreference = readThemePreference()): ThemeMode {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  return systemPrefersDark() ? 'dark' : 'light'
}

/** @deprecated prefer resolveTheme + preference */
export function resolveInitialTheme(): ThemeMode {
  return resolveTheme()
}

export function applyAccent(accent: AccentId = readAccent()) {
  const root = document.documentElement
  root.setAttribute('data-accent', accent)
  try {
    localStorage.setItem(ACCENT_KEY, accent)
  } catch {
    /* ignore */
  }
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = mode
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* ignore */
  }
  // keep accent in sync when theme flips
  applyAccent(readAccent())
}

export function setThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_PREF_KEY, pref)
  } catch {
    /* ignore */
  }
  const mode = resolveTheme(pref)
  applyTheme(mode)
  return mode
}

export function setAccent(accent: AccentId) {
  applyAccent(accent)
  return accent
}

/** Inline boot — FOUC 前套用深淺＋主題色 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('talktgtla-theme-pref');var m=localStorage.getItem('talktgtla-theme');var dark=false;if(p==='dark'||(!p&&m==='dark'))dark=true;else if(p==='light'||(!p&&m==='light'))dark=false;else dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(dark)r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=dark?'dark':'light';var a=localStorage.getItem('talktgtla-accent');if(a==='teal'||a==='pink'||a==='green'||a==='blue'||a==='ink')r.setAttribute('data-accent',a);else r.setAttribute('data-accent','teal');}catch(e){}})();`
