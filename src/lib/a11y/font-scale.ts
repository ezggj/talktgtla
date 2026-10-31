/** Global UI type scale — sm / md / lg on <html data-font-scale>. */

export type FontScale = 'sm' | 'md' | 'lg'

export const FONT_SCALE_KEY = 'talktgtla-font-scale-v1'

export function loadFontScale(): FontScale {
  if (typeof window === 'undefined') return 'md'
  try {
    const v = localStorage.getItem(FONT_SCALE_KEY)
    if (v === 'sm' || v === 'md' || v === 'lg') return v
  } catch {
    /* ignore */
  }
  return 'md'
}

export function applyFontScale(scale: FontScale) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.fontScale = scale
  try {
    localStorage.setItem(FONT_SCALE_KEY, scale)
  } catch {
    /* ignore */
  }
}

export const FONT_SCALE_BOOT_SCRIPT = `(function(){try{var v=localStorage.getItem('talktgtla-font-scale-v1');if(v==='sm'||v==='md'||v==='lg')document.documentElement.setAttribute('data-font-scale',v);else document.documentElement.setAttribute('data-font-scale','md');}catch(e){}})();`
