import assert from 'node:assert/strict'
import test from 'node:test'
import { isObviousInsult } from './profanity'

test('hides obvious insults, keeps normal chat', () => {
  assert.equal(isObviousInsult('fk u'), true)
  assert.equal(isObviousInsult('FKU'), true)
  assert.equal(isObviousInsult('f**k you'), true)
  assert.equal(isObviousInsult('屌你'), true)
  assert.equal(isObviousInsult('仆街啊'), true)
  assert.equal(isObviousInsult('今日腿日好攰'), false)
  assert.equal(isObviousInsult('function'), false)
  assert.equal(isObviousInsult('f**k you'), true)
  assert.equal(isObviousInsult('gym撚常食雞胸'), false)
  assert.equal(isObviousInsult('大癲'), false)
  assert.equal(isObviousInsult(''), false)
})
