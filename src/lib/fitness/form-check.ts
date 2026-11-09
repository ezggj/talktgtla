/**
 * Lightweight squat / deadlift form check.
 *
 * 2D angles from the side whose landmarks are clearer. Side-on video is the
 * one to trust: front, rear, and strong 3/4 views foreshorten knee bend, so
 * those frames are dropped when both shoulders stay visible and wide.
 * Thresholds are simple coaching rules, not a medical assessment.
 */

export type PoseLandmark = {
  x: number
  y: number
  z?: number
  visibility?: number
}

export type FormCheckKind = 'squat' | 'deadlift'

export type AngleTone = 'green' | 'yellow' | 'red'

export type FormAngle = {
  id: string
  label: string
  degrees: number
  tone: AngleTone
  note: string
}

export type PoseSide = 'left' | 'right'

export type FormFrame = {
  side: PoseSide
  visibility: number
  knee: number
  hip: number
  /** Shoulder–hip lean from upright. 0 = vertical. */
  torso: number
}

/** Chosen-side joints must each clear this, or the frame is unusable. */
export const MIN_LANDMARK_VISIBILITY = 0.5

/**
 * Shoulder/hip width divided by torso length. Above this, both sides are
 * facing the camera (front or rear) and knee bend reads too small.
 */
export const SIDE_VIEW_MAX_WIDTH_RATIO = 0.72

const SQUAT_IDS = new Set([
  'squat',
  'front-squat',
  'goblet-squat',
  'box-squat',
  'hack-squat',
])

const DEADLIFT_IDS = new Set(['deadlift', 'sumo-deadlift'])

const LEFT = { shoulder: 11, hip: 23, knee: 25, ankle: 27 }
const RIGHT = { shoulder: 12, hip: 24, knee: 26, ankle: 28 }

const TONE_ZH: Record<AngleTone, string> = {
  green: '綠',
  yellow: '黃',
  red: '紅',
}

export function formCheckKind(exerciseId: string | null | undefined): FormCheckKind | null {
  if (!exerciseId) return null
  if (SQUAT_IDS.has(exerciseId)) return 'squat'
  if (DEADLIFT_IDS.has(exerciseId)) return 'deadlift'
  return null
}

export function angleDeg(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number | null {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const mag1 = Math.hypot(abx, aby)
  const mag2 = Math.hypot(cbx, cby)
  if (mag1 < 1e-6 || mag2 < 1e-6) return null
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / (mag1 * mag2)))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Degrees off upright. Image y grows downward. */
export function torsoLeanDeg(shoulder: PoseLandmark, hip: PoseLandmark): number | null {
  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y
  if (Math.hypot(dx, dy) < 1e-6) return null
  const deg = (Math.atan2(Math.abs(dx), -dy) * 180) / Math.PI
  return Number.isFinite(deg) ? deg : null
}

function visibilityOf(lm: PoseLandmark | undefined): number {
  if (!lm || !Number.isFinite(lm.x) || !Number.isFinite(lm.y)) return 0
  if (typeof lm.visibility !== 'number' || !Number.isFinite(lm.visibility)) return 0
  return lm.visibility
}

function sideStats(landmarks: PoseLandmark[], side: typeof LEFT) {
  const vals = [side.shoulder, side.hip, side.knee, side.ankle].map((i) => visibilityOf(landmarks[i]))
  const mean = vals.reduce((sum, n) => sum + n, 0) / vals.length
  return { mean, min: Math.min(...vals) }
}

export function chooseSide(landmarks: PoseLandmark[]): { side: PoseSide; visibility: number } | null {
  if (!landmarks || landmarks.length < 29) return null
  const left = sideStats(landmarks, LEFT)
  const right = sideStats(landmarks, RIGHT)
  const side: PoseSide = right.mean > left.mean ? 'right' : 'left'
  const picked = side === 'right' ? right : left
  if (picked.min < MIN_LANDMARK_VISIBILITY) return null
  return { side, visibility: picked.mean }
}

/**
 * Width / torso length when both shoulders and both hips are visible.
 * Null when the far side is hidden — that is usually a real side view.
 */
export function shoulderHipWidthRatio(landmarks: PoseLandmark[]): number | null {
  const ls = landmarks[11]
  const rs = landmarks[12]
  const lh = landmarks[23]
  const rh = landmarks[24]
  if (!ls || !rs || !lh || !rh) return null
  if ([ls, rs, lh, rh].some((p) => visibilityOf(p) < MIN_LANDMARK_VISIBILITY)) return null
  const width = Math.max(Math.abs(ls.x - rs.x), Math.abs(lh.x - rh.x))
  const torso = Math.hypot((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2)
  if (torso < 1e-4) return null
  return width / torso
}

export function readFrame(landmarks: PoseLandmark[]): FormFrame | null {
  const picked = chooseSide(landmarks)
  if (!picked) return null
  const ratio = shoulderHipWidthRatio(landmarks)
  if (ratio != null && ratio > SIDE_VIEW_MAX_WIDTH_RATIO) return null
  const joints = picked.side === 'left' ? LEFT : RIGHT
  const shoulder = landmarks[joints.shoulder]
  const hip = landmarks[joints.hip]
  const knee = landmarks[joints.knee]
  const ankle = landmarks[joints.ankle]
  if (!shoulder || !hip || !knee || !ankle) return null
  const kneeDeg = angleDeg(hip, knee, ankle)
  const hipDeg = angleDeg(shoulder, hip, knee)
  const torso = torsoLeanDeg(shoulder, hip)
  if (kneeDeg == null || hipDeg == null || torso == null) return null
  return {
    side: picked.side,
    visibility: picked.visibility,
    knee: kneeDeg,
    hip: hipDeg,
    torso,
  }
}

function toneIn(
  deg: number,
  green: readonly [number, number],
  yellow: readonly [number, number]
): AngleTone {
  if (deg >= green[0] && deg <= green[1]) return 'green'
  if (deg >= yellow[0] && deg <= yellow[1]) return 'yellow'
  return 'red'
}

function squatKnee(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [70, 105], [55, 125])
  if (tone === 'green') return { tone, note: '深度幾好' }
  if (tone === 'yellow') {
    return { tone, note: deg < 70 ? '蹲得深咗少少' : '可以再蹲深少少' }
  }
  return { tone, note: deg < 55 ? '太深，膝唔舒服就停' : '未蹲夠深' }
}

function squatTorso(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [0, 45], [0, 58])
  if (tone === 'green') return { tone, note: '前傾得幾穩' }
  if (tone === 'yellow') return { tone, note: '上身傾多咗少少' }
  return { tone, note: '上身塌得太前' }
}

function squatHip(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [45, 100], [30, 120])
  if (tone === 'green') return { tone, note: '髖開合幾好' }
  if (tone === 'yellow') return { tone, note: deg > 100 ? '髖未摺夠' : '髖摺得幾深' }
  return { tone, note: deg > 120 ? '髖幾乎未摺' : '髖摺得太盡' }
}

function deadliftHip(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [50, 115], [35, 140])
  if (tone === 'green') return { tone, note: '鉸腰幾清楚' }
  if (tone === 'yellow') return { tone, note: deg > 115 ? '可以再鉸低少少' : '鉸得低，小心變深蹲' }
  return { tone, note: deg > 140 ? '未見到鉸腰' : '鉸得太低，好似深蹲' }
}

function deadliftBack(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [20, 60], [10, 75])
  if (tone === 'green') return { tone, note: '個背幾直' }
  if (tone === 'yellow') return { tone, note: deg > 60 ? '胸可以再抬高少少' : '企得幾直' }
  return { tone, note: deg > 75 ? '個背太平，胸再抬高啲' : '未係拉之前嗰下' }
}

function deadliftKnee(deg: number): Pick<FormAngle, 'tone' | 'note'> {
  const tone = toneIn(deg, [110, 160], [95, 172])
  if (tone === 'green') return { tone, note: '膝彎得幾好' }
  if (tone === 'yellow') return { tone, note: deg < 110 ? '膝彎多咗少少' : '膝伸得幾直' }
  return { tone, note: deg < 95 ? '膝彎得太深' : '膝幾乎伸直' }
}

export function scoreSquatAngles(knee: number, torso: number, hip: number): FormAngle[] {
  const kneeScore = squatKnee(knee)
  const torsoScore = squatTorso(torso)
  const hipScore = squatHip(hip)
  return [
    { id: 'knee', label: '膝角', degrees: knee, ...kneeScore },
    { id: 'torso', label: '上身前傾', degrees: torso, ...torsoScore },
    { id: 'hip', label: '髖角', degrees: hip, ...hipScore },
  ]
}

export function scoreDeadliftAngles(hip: number, torso: number, knee: number): FormAngle[] {
  const hipScore = deadliftHip(hip)
  const backScore = deadliftBack(torso)
  const kneeScore = deadliftKnee(knee)
  return [
    { id: 'hip', label: '髖鉸', degrees: hip, ...hipScore },
    { id: 'back', label: '個背', degrees: torso, ...backScore },
    { id: 'knee', label: '膝角', degrees: knee, ...kneeScore },
  ]
}

export function anglesFor(kind: FormCheckKind, frame: FormFrame): FormAngle[] {
  if (kind === 'squat') return scoreSquatAngles(frame.knee, frame.torso, frame.hip)
  return scoreDeadliftAngles(frame.hip, frame.torso, frame.knee)
}

export function angleSlots(kind: FormCheckKind): { id: string; label: string }[] {
  if (kind === 'squat') {
    return [
      { id: 'knee', label: '膝角' },
      { id: 'torso', label: '上身前傾' },
      { id: 'hip', label: '髖角' },
    ]
  }
  return [
    { id: 'hip', label: '髖鉸' },
    { id: 'back', label: '個背' },
    { id: 'knee', label: '膝角' },
  ]
}

/**
 * Keep the deepest usable frame. Squat: smaller knee angle.
 * Deadlift: smaller hip angle (more hinge). Unusable frames are ignored.
 */
export function latchDeepest(
  kind: FormCheckKind,
  previous: FormFrame | null,
  next: FormFrame | null
): FormFrame | null {
  if (!next) return previous
  if (!previous) return next
  const prevDepth = kind === 'squat' ? previous.knee : previous.hip
  const nextDepth = kind === 'squat' ? next.knee : next.hip
  return nextDepth < prevDepth ? next : previous
}

export function formCheckSummary(nameZh: string, angles: FormAngle[]): string {
  const bits = angles.map((a) => `${a.label}${Math.round(a.degrees)}°${TONE_ZH[a.tone]}`)
  return `${nameZh}：${bits.join(' · ')}`
}
