import assert from 'node:assert/strict'
import test from 'node:test'
import { isTinySession, sessionPersonalRecords, analyzeWorkout } from './analysis'
import type { WorkoutSession, WorkoutSet } from './storage'

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'exerciseId' | 'weightKg' | 'reps'>): WorkoutSet {
  return {
    id: partial.id || `${partial.exerciseId}-1`,
    exerciseName: partial.exerciseName || partial.exerciseId,
    setIndex: partial.setIndex || 1,
    completedAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  }
}

function session(partial: Partial<WorkoutSession> & Pick<WorkoutSession, 'id' | 'sets'>): WorkoutSession {
  return {
    startedAt: '2026-11-01T09:00:00.000Z',
    endedAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  }
}

test('one set is a tiny session and is not a PR day', () => {
  const only = session({
    id: 'a',
    sets: [set({ exerciseId: 'bench', exerciseName: '臥推', weightKg: 40, reps: 8 })],
  })
  assert.equal(isTinySession(only.sets), true)
  const analysis = analyzeWorkout(only, [])
  assert.equal(analysis.countsAsDay, false)
  assert.equal(analysis.prs?.length ?? 0, 0)
  assert.match(analysis.tips[0] || '', /未當一場/)
})

test('beating an earlier session is a real PR even in one set', () => {
  const prev = session({
    id: 'old',
    sets: [set({ exerciseId: 'bench', weightKg: 40, reps: 5 })],
  })
  const now = session({
    id: 'now',
    sets: [set({ exerciseId: 'bench', exerciseName: '臥推', weightKg: 42.5, reps: 5 })],
  })
  assert.equal(isTinySession(now.sets), true)
  const prs = sessionPersonalRecords(now, [prev])
  assert.equal(prs.length, 1)
  assert.equal(prs[0]?.beaten, true)
  const analysis = analyzeWorkout(now, [prev])
  assert.equal(analysis.countsAsDay, true)
})

test('a normal session counts as a day without inventing a first-log PR', () => {
  const sets = [1, 2, 3, 4].map((n) =>
    set({ id: `s${n}`, exerciseId: 'squat', setIndex: n, weightKg: 60, reps: 8 })
  )
  const now = session({ id: 'full', sets })
  assert.equal(isTinySession(sets), false)
  assert.equal(analyzeWorkout(now, []).countsAsDay, true)
  assert.equal(analyzeWorkout(now, []).prs?.length ?? 0, 0)
})
