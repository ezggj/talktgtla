import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextPlanExerciseId, offerNextPlanExercise } from './plan-queue'

test('next plan exercise follows template order', () => {
  const q = ['bench', 'row', 'squat']
  assert.equal(nextPlanExerciseId(q, 'bench'), 'row')
  assert.equal(nextPlanExerciseId(q, 'row'), 'squat')
  assert.equal(nextPlanExerciseId(q, 'squat'), null)
  assert.equal(nextPlanExerciseId(q, null), 'bench')
  assert.equal(nextPlanExerciseId([], 'bench'), null)
})

test('selected not in queue → first different id', () => {
  assert.equal(nextPlanExerciseId(['bench', 'row'], 'curl'), 'bench')
})

test('offer next is soft until enough sets, then emphasize', () => {
  const soft = offerNextPlanExercise({
    queue: ['bench', 'row'],
    selectedId: 'bench',
    setsForSelected: 1,
  })
  assert.deepEqual(soft, { nextId: 'row', emphasize: false })

  const hard = offerNextPlanExercise({
    queue: ['bench', 'row'],
    selectedId: 'bench',
    setsForSelected: 3,
  })
  assert.deepEqual(hard, { nextId: 'row', emphasize: true })

  assert.equal(
    offerNextPlanExercise({
      queue: ['bench'],
      selectedId: 'bench',
      setsForSelected: 5,
    }),
    null
  )
})
