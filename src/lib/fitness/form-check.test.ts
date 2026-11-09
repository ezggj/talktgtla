import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SIDE_VIEW_MAX_WIDTH_RATIO,
  angleDeg,
  anglesFor,
  chooseSide,
  formCheckKind,
  formCheckSummary,
  latchDeepest,
  readFrame,
  scoreDeadliftAngles,
  scoreSquatAngles,
  shoulderHipWidthRatio,
  torsoLeanDeg,
  type FormFrame,
  type PoseLandmark,
} from './form-check'

function lm(x: number, y: number, visibility = 0.95): PoseLandmark {
  return { x, y, visibility }
}

function pose(partial: Partial<Record<number, PoseLandmark>>): PoseLandmark[] {
  const arr: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }))
  for (const [key, value] of Object.entries(partial)) {
    if (value) arr[Number(key)] = value
  }
  return arr
}

function frame(partial: Partial<FormFrame> & Pick<FormFrame, 'knee' | 'hip' | 'torso'>): FormFrame {
  return {
    side: 'left',
    visibility: 0.9,
    ...partial,
  }
}

test('angle at the joint is 90 and a straight line is 180', () => {
  const right = angleDeg(lm(0, 0), lm(0, 1), lm(1, 1))
  const straight = angleDeg(lm(0, 0), lm(0, 1), lm(0, 2))
  assert.ok(right != null && Math.abs(right - 90) < 0.01)
  assert.ok(straight != null && Math.abs(straight - 180) < 0.01)
})

test('torso lean is 0 upright, 45 at a diagonal, 90 folded flat', () => {
  const up = torsoLeanDeg(lm(0.5, 0.2), lm(0.5, 0.6))
  const diag = torsoLeanDeg(lm(0.6, 0.4), lm(0.5, 0.5))
  const flat = torsoLeanDeg(lm(0.8, 0.5), lm(0.5, 0.5))
  assert.ok(up != null && up < 0.01)
  assert.ok(diag != null && Math.abs(diag - 45) < 0.01)
  assert.ok(flat != null && Math.abs(flat - 90) < 0.01)
})

test('form check only covers squat and deadlift variants, not RDL', () => {
  assert.equal(formCheckKind('squat'), 'squat')
  assert.equal(formCheckKind('front-squat'), 'squat')
  assert.equal(formCheckKind('goblet-squat'), 'squat')
  assert.equal(formCheckKind('box-squat'), 'squat')
  assert.equal(formCheckKind('hack-squat'), 'squat')
  assert.equal(formCheckKind('deadlift'), 'deadlift')
  assert.equal(formCheckKind('sumo-deadlift'), 'deadlift')
  assert.equal(formCheckKind('rdl'), null)
  assert.equal(formCheckKind('good-morning'), null)
  assert.equal(formCheckKind('bulgarian-split'), null)
  assert.equal(formCheckKind('lunges'), null)
  assert.equal(formCheckKind(null), null)
})

test('picks the side with clearer landmarks', () => {
  const rightClear = pose({
    11: lm(0.4, 0.2, 0.2),
    23: lm(0.4, 0.45, 0.2),
    25: lm(0.4, 0.7, 0.2),
    27: lm(0.4, 0.95, 0.2),
    12: lm(0.55, 0.2, 0.96),
    24: lm(0.55, 0.5, 0.96),
    26: lm(0.55, 0.7, 0.96),
    28: lm(0.8, 0.7, 0.96),
  })
  assert.equal(chooseSide(rightClear)?.side, 'right')
  const frameRight = readFrame(rightClear)
  assert.ok(frameRight)
  assert.equal(frameRight?.side, 'right')
  assert.ok(frameRight != null && Math.abs(frameRight.knee - 90) < 0.5)
})

test('drops a frame when the chosen side is hard to see', () => {
  const murky = pose({
    11: lm(0.5, 0.2, 0.4),
    23: lm(0.5, 0.5, 0.9),
    25: lm(0.5, 0.7, 0.9),
    27: lm(0.5, 0.95, 0.2),
  })
  assert.equal(readFrame(murky), null)
})

test('front and rear views are not usable — they understate knee bend', () => {
  const front = pose({
    11: lm(0.25, 0.22, 0.95),
    12: lm(0.75, 0.22, 0.95),
    23: lm(0.32, 0.52, 0.95),
    24: lm(0.68, 0.52, 0.95),
    25: lm(0.3, 0.72, 0.95),
    26: lm(0.7, 0.72, 0.95),
    27: lm(0.3, 0.95, 0.95),
    28: lm(0.7, 0.95, 0.95),
  })
  const ratio = shoulderHipWidthRatio(front)
  assert.ok(ratio != null && ratio > SIDE_VIEW_MAX_WIDTH_RATIO)
  assert.equal(readFrame(front), null)
})

test('side view with the far side hidden still counts', () => {
  const side = pose({
    11: lm(0.48, 0.18, 0.98),
    23: lm(0.48, 0.48, 0.98),
    25: lm(0.48, 0.72, 0.98),
    27: lm(0.48, 0.95, 0.98),
  })
  const got = readFrame(side)
  assert.ok(got)
  assert.equal(got?.side, 'left')
  assert.ok(got != null && got.torso < 2)
  assert.ok(got != null && got.knee > 170)
  assert.equal(shoulderHipWidthRatio(side), null)
})

test('squat tones at the band edges', () => {
  const green = scoreSquatAngles(90, 20, 80)
  assert.deepEqual(green.map((a) => a.tone), ['green', 'green', 'green'])
  assert.equal(green[0].label, '膝角')
  assert.equal(green[1].label, '上身前傾')
  assert.equal(green[2].label, '髖角')

  const edges = scoreSquatAngles(70, 45, 100)
  assert.deepEqual(edges.map((a) => a.tone), ['green', 'green', 'green'])

  const yellow = scoreSquatAngles(69, 46, 101)
  assert.deepEqual(yellow.map((a) => a.tone), ['yellow', 'yellow', 'yellow'])
  assert.equal(yellow[0].note, '蹲得深咗少少')
  assert.equal(scoreSquatAngles(120, 10, 40)[0].note, '可以再蹲深少少')

  const red = scoreSquatAngles(54, 59, 121)
  assert.deepEqual(red.map((a) => a.tone), ['red', 'red', 'red'])
  assert.equal(red[0].note, '太深，膝唔舒服就停')
  assert.equal(scoreSquatAngles(126, 10, 80)[0].note, '未蹲夠深')
  assert.equal(scoreSquatAngles(90, 70, 80)[1].note, '上身塌得太前')
})

test('deadlift tones cover hinge, back, and knee', () => {
  const green = scoreDeadliftAngles(80, 40, 140)
  assert.deepEqual(green.map((a) => [a.id, a.label, a.tone]), [
    ['hip', '髖鉸', 'green'],
    ['back', '個背', 'green'],
    ['knee', '膝角', 'green'],
  ])
  const yellow = scoreDeadliftAngles(120, 70, 100)
  assert.deepEqual(yellow.map((a) => a.tone), ['yellow', 'yellow', 'yellow'])
  const red = scoreDeadliftAngles(150, 80, 90)
  assert.deepEqual(red.map((a) => a.tone), ['red', 'red', 'red'])
  assert.equal(red[0].note, '未見到鉸腰')
  assert.equal(red[1].note, '個背太平，胸再抬高啲')
  assert.equal(red[2].note, '膝彎得太深')
  assert.equal(scoreDeadliftAngles(30, 40, 180)[0].note, '鉸得太低，好似深蹲')
  assert.equal(scoreDeadliftAngles(80, 5, 140)[1].note, '未係拉之前嗰下')
  assert.equal(scoreDeadliftAngles(80, 40, 175)[2].note, '膝幾乎伸直')
})

test('latches the deepest usable squat and deadlift frame', () => {
  const standing = frame({ knee: 170, hip: 170, torso: 5 })
  const shallow = frame({ knee: 130, hip: 120, torso: 25 })
  const deep = frame({ knee: 85, hip: 70, torso: 30 })
  assert.equal(latchDeepest('squat', null, null), null)
  assert.equal(latchDeepest('squat', standing, null), standing)
  let squat = latchDeepest('squat', null, standing)
  squat = latchDeepest('squat', squat, shallow)
  squat = latchDeepest('squat', squat, deep)
  squat = latchDeepest('squat', squat, shallow)
  assert.equal(squat, deep)

  const hinge = frame({ knee: 140, hip: 75, torso: 40 })
  const lockout = frame({ knee: 175, hip: 170, torso: 8 })
  let pull = latchDeepest('deadlift', lockout, hinge)
  pull = latchDeepest('deadlift', pull, lockout)
  assert.equal(pull, hinge)
})

test('summary is one spoken line and does not say 上雲', () => {
  const angles = anglesFor('squat', frame({ knee: 88.4, hip: 125, torso: 50.4 }))
  const line = formCheckSummary('深蹲', angles)
  assert.equal(line, '深蹲：膝角88°綠 · 上身前傾50°黃 · 髖角125°紅')
  assert.equal(line.includes('上雲'), false)
  const pull = formCheckSummary('硬拉', scoreDeadliftAngles(92, 48, 138))
  assert.match(pull, /^硬拉：髖鉸92°綠 · 個背48°綠 · 膝角138°綠$/)
})
