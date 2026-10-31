/** Soft Web Audio beeps for rest / log — user can mute. */

const SFX_KEY = 'talktgtla-train-sfx-v1'

export function loadTrainSfxEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem(SFX_KEY)
    if (v === '0') return false
    return true
  } catch {
    return true
  }
}

export function saveTrainSfxEnabled(on: boolean) {
  try {
    localStorage.setItem(SFX_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, durMs: number, gain = 0.05, type: OscillatorType = 'sine') {
  if (!loadTrainSfxEnabled()) return
  const ac = getCtx()
  if (!ac) return
  void ac.resume().catch(() => undefined)
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ac.destination)
  const now = ac.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + durMs / 1000)
  osc.start(now)
  osc.stop(now + durMs / 1000 + 0.02)
}

export function sfxLogSet() {
  tone(660, 70, 0.04, 'triangle')
}

export function sfxRestDone() {
  tone(523, 90, 0.05, 'sine')
  window.setTimeout(() => tone(659, 110, 0.055, 'sine'), 100)
  window.setTimeout(() => tone(784, 140, 0.06, 'sine'), 220)
}

export function sfxRestTick() {
  tone(440, 40, 0.025, 'sine')
}
