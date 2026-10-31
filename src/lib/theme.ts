export type ThemeMode = 'light' | 'dark'
/** User preference: follow OS, or force light/dark */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_KEY = 'talktgtla-theme'
export const THEME_PREF_KEY = 'talktgtla-theme-pref'

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
    // Legacy: only THEME_KEY set → treat as manual
    const legacy = localStorage.getItem(THEME_KEY)
    if (legacy === 'light' || legacy === 'dark') return legacy
  } catch {
    /* ignore */
  }
  return 'system'
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

/** Inline boot script — paste into layout <head> to avoid FOUC */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('talktgtla-theme-pref');var m=localStorage.getItem('talktgtla-theme');var dark=false;if(p==='dark'||(!p&&m==='dark'))dark=true;else if(p==='light'||(!p&&m==='light'))dark=false;else dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(dark)r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`
