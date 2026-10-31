import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { hkDayKey, previousHkDay } from './hk-day'
import {
  nextTrainAiCount,
  parseTrainAiCookie,
  serverTrainAiLimit,
  trainAiLimitCopy,
} from './train-ai-quota'
import { prefillSetForExercise } from './last-set'
import {
  buildAskStub,
  buildBetweenSetTip,
  buildFinishLines,
  buildOpenTip,
  shortExerciseName,
  tipForAsk,
} from './train-tips'
import type { WorkoutSession, WorkoutSet } from './storage'

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'id' | 'exerciseId'>): WorkoutSet {
  return {
    exerciseName: partial.exerciseId,
    setIndex: 1,
    weightKg: 60,
    reps: 8,
    completedAt: '2026-10-30T04:00:00.000Z',
    ...partial,
  }
}

function finished(
  id: string,
  endedAt: string,
  sets: WorkoutSet[],
  templateId?: string
): WorkoutSession {
  return { id, startedAt: endedAt, endedAt, sets, templateId }
}

test('short names: RDL stays RDL, squat stays 深蹲', () => {
  assert.equal(shortExerciseName('羅馬尼亞硬拉', 'RDL'), 'RDL')
  assert.equal(shortExerciseName('深蹲', 'Squat'), '深蹲')
})

test('open tip quotes last solid set and suggests +2.5', () => {
  const history = [
    finished('s1', '2026-10-30T04:00:00.000Z', [
      set({ id: 'a', exerciseId: 'squat', exerciseName: '深蹲', weightKg: 60, reps: 8 }),
    ]),
  ]
  const tip = buildOpenTip({
    exerciseId: 'squat',
    name: '深蹲',
    sessions: history,
    activeId: 'now',
  })
  assert.ok(tip)
  assert.equal(tip.source, 'rules')
  assert.equal(tip.lines[0], '上次深蹲 60kg × 8，今日試 62.5kg')
  assert.equal(tip.suggestedWeightKg, 62.5)
  assert.ok(tip.lines.length <= 2)
})

test('open tip treats a heavy RDL as a 2.5kg drop', () => {
  const history = [
    finished('s1', '2026-10-30T04:00:00.000Z', [
      set({
        id: 'a',
        exerciseId: 'rdl',
        exerciseName: '羅馬尼亞硬拉',
        weightKg: 80,
        reps: 4,
        outcome: 'fail',
      }),
    ]),
  ]
  const tip = buildOpenTip({
    exerciseId: 'rdl',
    name: 'RDL',
    sessions: history,
  })
  assert.ok(tip)
  assert.equal(tip.lines[0], 'RDL 上次感覺重，今日可以減 2.5kg')
  assert.equal(tip.suggestedWeightKg, 77.5)
})

test('open tip uses the last three logs when they all hit the same weight', () => {
  const history = [1, 2, 3].map((n) =>
    finished(`s${n}`, `2026-10-${10 + n}T04:00:00.000Z`, [
      set({ id: `a${n}`, exerciseId: 'squat', weightKg: 60, reps: 8 }),
    ])
  )
  const tip = buildOpenTip({ exerciseId: 'squat', name: '深蹲', sessions: history })
  assert.ok(tip)
  assert.equal(tip.lines[0], '上次深蹲 60kg × 8，今日試 62.5kg')
  assert.equal(tip.lines[1], '近三次都打齊，可以試加')
})

test('open tip uses the same last set the weight field prefills', () => {
  const history = [
    finished('s1', '2026-10-30T04:00:00.000Z', [
      set({ id: 'heavy', exerciseId: 'squat', exerciseName: '深蹲', weightKg: 60, reps: 8 }),
      set({ id: 'last', exerciseId: 'squat', exerciseName: '深蹲', weightKg: 40, reps: 12 }),
    ]),
  ]
  const tip = buildOpenTip({ exerciseId: 'squat', name: '深蹲', sessions: history })
  const prefill = prefillSetForExercise(history, 'squat', null)
  assert.equal(prefill?.set.weightKg, 40)
  assert.equal(prefill?.set.reps, 12)
  assert.ok(tip)
  assert.equal(tip.lines[0], '上次深蹲 40kg × 12，今日試 42.5kg')
  assert.equal(tip.suggestedWeightKg, 42.5)
})

test('open tip is quiet when the exercise has no history', () => {
  assert.equal(
    buildOpenTip({ exerciseId: 'squat', name: '深蹲', sessions: [] }),
    null
  )
})

test('between sets: solid set can add 2.5, one rep short holds', () => {
  const history = [
    finished('s1', '2026-10-30T04:00:00.000Z', [
      set({ id: 'h', exerciseId: 'squat', weightKg: 60, reps: 8 }),
    ]),
  ]
  const solid = buildBetweenSetTip({
    exerciseId: 'squat',
    name: '深蹲',
    logged: set({ id: 'n', exerciseId: 'squat', weightKg: 60, reps: 8, outcome: 'ok' }),
    activeSets: [set({ id: 'n', exerciseId: 'squat', weightKg: 60, reps: 8, outcome: 'ok' })],
    sessions: history,
    activeId: 'now',
  })
  assert.ok(solid)
  assert.equal(solid.lines[0], '呢組穩，下組可以加 2.5kg')
  assert.equal(solid.suggestedWeightKg, 62.5)
  assert.equal(solid.source, 'rules')

  const short = buildBetweenSetTip({
    exerciseId: 'squat',
    name: '深蹲',
    logged: set({ id: 'n2', exerciseId: 'squat', weightKg: 60, reps: 7, outcome: 'ok' }),
    activeSets: [set({ id: 'n2', exerciseId: 'squat', weightKg: 60, reps: 7, outcome: 'ok' })],
    sessions: history,
    activeId: 'now',
  })
  assert.ok(short)
  assert.equal(short.lines[0], '差 1 下，下組保持重量')
  assert.equal(short.suggestedWeightKg, 60)
})

test('between sets does not keep adding after the weight already went up', () => {
  const history = [
    finished('s1', '2026-10-30T04:00:00.000Z', [
      set({ id: 'h', exerciseId: 'squat', weightKg: 60, reps: 8 }),
    ]),
  ]
  const first = set({ id: 'a', exerciseId: 'squat', weightKg: 60, reps: 8 })
  const second = set({ id: 'b', exerciseId: 'squat', weightKg: 62.5, reps: 8 })
  const tip = buildBetweenSetTip({
    exerciseId: 'squat',
    name: '深蹲',
    logged: second,
    activeSets: [first, second],
    sessions: history,
    activeId: 'now',
  })
  assert.ok(tip)
  assert.equal(tip.lines[0], '呢組穩，下組保持呢個重量')
  assert.equal(tip.suggestedWeightKg, 62.5)
})

test('finish card: volume versus last session, plus a leg-day line', () => {
  const prev = finished('prev', '2026-10-30T04:00:00.000Z', [
    set({ id: 'p', exerciseId: 'squat', weightKg: 100, reps: 10 }),
  ])
  const current = finished(
    'now',
    '2026-10-31T04:00:00.000Z',
    [set({ id: 'c', exerciseId: 'squat', weightKg: 108, reps: 10 })],
    'ppl-legs'
  )
  const lines = buildFinishLines(current, [prev])
  assert.deepEqual(lines, ['今日容量比上次高 8%', '腿日完成，下一次建議休息或輕練'])
})

test('finish card suggests rest after two days in a row', () => {
  const prev = finished('prev', '2026-10-30T04:00:00.000Z', [
    set({ id: 'p', exerciseId: 'squat', weightKg: 60, reps: 8 }),
  ])
  const current = finished('now', '2026-10-31T04:00:00.000Z', [
    set({ id: 'c', exerciseId: 'plank', weightKg: 10, reps: 40 }),
  ])
  const lines = buildFinishLines(current, [prev])
  assert.equal(lines[0]?.includes('容量比上次'), true)
  assert.equal(lines[1], '連續兩日，下一次建議休息或輕練')
})

test('問 AI stub stays on the rules and does not invent a model reply', () => {
  const tip = buildOpenTip({
    exerciseId: 'squat',
    name: '深蹲',
    sessions: [
      finished('s1', '2026-10-30T04:00:00.000Z', [
        set({ id: 'a', exerciseId: 'squat', weightKg: 60, reps: 8 }),
      ]),
    ],
  })
  const line = buildAskStub(tip, '深蹲')
  assert.match(line, /62\.5kg/)
  assert.match(line, /第一下穩先做齊/)
  assert.equal(line.includes('模型'), false)

  const viaAsk = tipForAsk({
    kind: 'open',
    exerciseId: 'squat',
    name: '深蹲',
    recent: [{ weightKg: 60, reps: 8 }],
    today: [],
  })
  assert.equal(viaAsk?.lines[0], tip?.lines[0])
  assert.equal(viaAsk?.source, 'rules')
})

test('daily 問 AI counter stops at the free limit', () => {
  assert.equal(serverTrainAiLimit(), 3)
  assert.deepEqual(nextTrainAiCount(2, 3), { ok: true, used: 3, remaining: 0 })
  assert.deepEqual(nextTrainAiCount(3, 3), { ok: false, used: 3, remaining: 0 })
  assert.equal(parseTrainAiCookie('2026-10-31:2', '2026-10-31'), 2)
  assert.equal(parseTrainAiCookie('2026-10-30:2', '2026-10-31'), 0)
  assert.match(trainAiLimitCopy(3), /用完 3 次/)
  assert.match(trainAiLimitCopy(3), /小提示仍然喺度/)
})

test('Hong Kong day rolls across month boundaries', () => {
  assert.equal(previousHkDay('2026-03-01'), '2026-02-28')
  assert.equal(previousHkDay('2024-03-01'), '2024-02-29')
  const hk = hkDayKey(new Date('2026-10-31T16:30:00.000Z'))
  assert.equal(hk, '2026-11-01')
})

test('train ask route does not call an LLM', () => {
  const src = readFileSync(new URL('../../app/api/train/ask/route.ts', import.meta.url), 'utf8')
  assert.equal(src.includes("from 'ai'"), false)
  assert.equal(src.includes('generateText'), false)
  assert.match(src, /source: 'rules'/)
  assert.match(src, /free_limit/)
})
