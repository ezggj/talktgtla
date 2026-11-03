import assert from 'node:assert/strict'
import { test } from 'node:test'
import { offlineDrainToastMessage } from './offline-drain'

test('drain toast only when something flushed', () => {
  assert.equal(offlineDrainToastMessage(0), null)
  assert.equal(offlineDrainToastMessage(-1), null)
  assert.equal(offlineDrainToastMessage(1), '返咗線——離線嗰陣嗰 1 項，已經同步去你帳戶。')
  assert.equal(offlineDrainToastMessage(3), '返咗線——離線嗰陣嗰 3 項，已經同步去你帳戶。')
})
