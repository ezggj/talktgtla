import assert from 'node:assert/strict'
import test from 'node:test'
import { startPoseEngine, type PoseDelegate, type PoseDetector } from './pose-session'

function fakeDetector(label: string, detectImpl: PoseDetector['detect']): PoseDetector & { label: string; closed: boolean } {
  const detector = {
    label,
    closed: false,
    detect: detectImpl,
    close() {
      detector.closed = true
    },
  }
  return detector
}

test('uses CPU when GPU setup throws', async () => {
  const made: PoseDelegate[] = []
  const engine = await startPoseEngine(async (delegate) => {
    made.push(delegate)
    if (delegate === 'GPU') throw new Error('no webgl')
    return fakeDetector('cpu', () => [{ x: 0, y: 0, visibility: 1 }])
  })
  assert.deepEqual(made, ['GPU', 'CPU'])
  assert.equal(engine.delegate, 'CPU')
  const points = await engine.detect({} as HTMLVideoElement, 10)
  assert.equal(points?.length, 1)
  engine.close()
})

test('falls back to CPU when GPU detect throws', async () => {
  const gpu = fakeDetector('gpu', () => {
    throw new Error('gpu lost')
  })
  const cpu = fakeDetector('cpu', () => [{ x: 1, y: 2, visibility: 0.9 }])
  const engine = await startPoseEngine(async (delegate) => (delegate === 'GPU' ? gpu : cpu))
  const points = await engine.detect({} as HTMLVideoElement, 30)
  assert.equal(engine.delegate, 'CPU')
  assert.equal(gpu.closed, true)
  assert.equal(points?.[0]?.x, 1)
  engine.close()
  assert.equal(cpu.closed, true)
})
