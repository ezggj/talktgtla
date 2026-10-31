import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOverloadTip } from './overload-tip'
import { prefillSetForExercise } from './last-set'
import type { WorkoutSession, WorkoutSet } from './storage'

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'exerciseId' | 'weightKg' | 'reps'>): WorkoutSet {
  return {
    id: partial.id || `${partial.exerciseId}-${partial.setIndex || 1}`,
    exerciseName: partial.exerciseName || partial.exerciseId,
    setIndex: partial.setIndex || 1,
    completedAt: partial.completedAt || '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function session(
  partial: Partial<WorkoutSession> & Pick<WorkoutSession, 'id' | 'sets'>
): WorkoutSession {
  return {
    startedAt: partial.startedAt || partial.endedAt || '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

test('new exercise has no prefill', () => {
  const sessions = [
    session({
      id: 'a',
      endedAt: '2026-02-01T00:00:00.000Z',
      sets: [set({ exerciseId: 'squat', weightKg: 80, reps: 5 })],
    }),
  ]
  assert.equal(prefillSetForExercise(sessions, 'bench', null), null)
})

test('prefers the latest finished session, not array order', () => {
  const older = session({
    id: 'old',
    endedAt: '2026-01-01T00:00:00.000Z',
    sets: [set({ exerciseId: 'squat', weightKg: 60, reps: 8, completedAt: '2026-01-01T00:10:00.000Z' })],
  })
  const newer = session({
    id: 'new',
    endedAt: '2026-03-01T00:00:00.000Z',
    sets: [
      set({ exerciseId: 'squat', weightKg: 100, reps: 3, setIndex: 1, completedAt: '2026-03-01T00:05:00.000Z' }),
      set({ exerciseId: 'squat', weightKg: 80, reps: 6, setIndex: 2, completedAt: '2026-03-01T00:12:00.000Z' }),
    ],
  })
  const found = prefillSetForExercise([older, newer], 'squat', null)
  assert.equal(found?.source, 'history')
  assert.equal(found?.set.weightKg, 80)
  assert.equal(found?.set.reps, 6)
})

test('mid-session uses the last set of the current exercise', () => {
  const history = session({
    id: 'done',
    endedAt: '2026-03-01T00:00:00.000Z',
    sets: [set({ exerciseId: 'bench', weightKg: 60, reps: 8 })],
  })
  const active = session({
    id: 'now',
    sets: [
      set({ exerciseId: 'bench', weightKg: 60, reps: 8, setIndex: 1, completedAt: '2026-04-01T00:01:00.000Z' }),
      set({ exerciseId: 'bench', weightKg: 62.5, reps: 6, setIndex: 2, completedAt: '2026-04-01T00:04:00.000Z' }),
      set({ exerciseId: 'squat', weightKg: 100, reps: 5, completedAt: '2026-04-01T00:08:00.000Z' }),
    ],
  })
  const bench = prefillSetForExercise([history], 'bench', active)
  assert.equal(bench?.source, 'active')
  assert.equal(bench?.set.weightKg, 62.5)
  assert.equal(bench?.set.reps, 6)

  const row = prefillSetForExercise([history], 'row', active)
  assert.equal(row, null)
})

test('ignores unfinished sessions that are not the active workout', () => {
  const draft = session({
    id: 'draft',
    sets: [set({ exerciseId: 'squat', weightKg: 40, reps: 10 })],
  })
  assert.equal(prefillSetForExercise([draft], 'squat', null), null)
})

test('下次試 stays on the same set as the prefill', () => {
  const sessions = [1, 2].map((n) =>
    session({
      id: `s${n}`,
      endedAt: `2026-0${n}-15T00:00:00.000Z`,
      sets: [
        set({
          exerciseId: 'squat',
          weightKg: 100,
          reps: 3,
          setIndex: 1,
          completedAt: `2026-0${n}-15T00:05:00.000Z`,
        }),
        set({
          exerciseId: 'squat',
          weightKg: 80,
          reps: 8,
          setIndex: 2,
          completedAt: `2026-0${n}-15T00:12:00.000Z`,
        }),
      ],
    })
  )
  const prefill = prefillSetForExercise(sessions, 'squat', null)
  assert.equal(prefill?.set.weightKg, 80)
  assert.equal(prefill?.set.reps, 8)

  const tip = buildOverloadTip('squat', sessions, null)
  assert.ok(tip?.suggestedWeightKg)
  const suggested = tip!.suggestedWeightKg!
  assert.ok(
    suggested === prefill!.set.weightKg || suggested === Math.round((prefill!.set.weightKg + 2.5) * 2) / 2,
    `suggested ${suggested} should match prefill ${prefill!.set.weightKg}`
  )
  assert.equal(suggested, 82.5)
})
