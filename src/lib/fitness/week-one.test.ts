import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isVegSideMeal, proteinThatCounts } from './protein-count'
import { proteinNudgeLine, remainingProteinLine, todayProteinTotalLine } from './protein-line'
import { streakComebackLine } from './streaks'
import { syncStatusText } from './sync-status'
import { mealIsHkQuickAdd, weekOneItems, weekOneVisible, type WeekOneFlags } from './week-one'

const flags: WeekOneFlags = {
  dismissed: false,
  hidden: false,
  goalSet: false,
  chipTried: false,
}

test('remaining protein line is spoken, not 剩餘蛋白質', () => {
  assert.equal(remainingProteinLine(78, 120), '仲差 42g protein')
  assert.equal(remainingProteinLine(120, 120), '今日夠喇 ✅')
  assert.equal(remainingProteinLine(140, 120), '今日夠喇 ✅')
  assert.equal(todayProteinTotalLine(78, 120), '今日 protein 78 / 120g')
  assert.equal(proteinNudgeLine(40), '仲差 40g — 打杯 whey？定加舊雞胸？')
})

test('碟菜 is about 1g and does not count toward protein', () => {
  const meals = [
    { name: '碟菜', macros: { protein: 1 } },
    { name: '菜心（半份）', macros: { protein: 1 } },
    { name: '烚雙蛋', macros: { protein: 12 } },
    { name: '打杯 whey', macros: { protein: 24 } },
  ]
  assert.equal(isVegSideMeal(meals[0]), true)
  assert.equal(isVegSideMeal(meals[1]), true)
  assert.equal(isVegSideMeal(meals[2]), false)
  assert.equal(proteinThatCounts(meals), 36)
})

test('week-one checklist follows real actions and can hide', () => {
  const open = weekOneItems(
    { finishedWorkouts: 0, hkQuickMeals: 0, hasPlan: false },
    flags
  )
  assert.equal(open.every((item) => !item.done), true)
  assert.equal(weekOneVisible(open, flags), true)

  const done = weekOneItems(
    { finishedWorkouts: 1, hkQuickMeals: 1, hasPlan: true },
    { ...flags, chipTried: true }
  )
  assert.equal(done.every((item) => item.done), true)
  assert.equal(weekOneVisible(done, flags), false)
  assert.equal(weekOneVisible(open, { ...flags, dismissed: true }), false)
  assert.equal(mealIsHkQuickAdd({ note: '茶記 · 港式快加' }), true)
  assert.equal(mealIsHkQuickAdd({ note: '一 scoop · 水沖 · 港式快加' }), true)
  assert.equal(mealIsHkQuickAdd({ note: '會所食堂' }), false)
})

test('streak comeback is one line, and only when today is empty', () => {
  assert.equal(streakComebackLine(4, false), '連練 4 日，今日未練——差少少就斷。')
  assert.equal(streakComebackLine(4, true), null)
  assert.equal(streakComebackLine(0, false), null)
})

test('offline and sync copy stay short', () => {
  assert.equal(
    syncStatusText({ online: false, loggedIn: true, pending: 1 }),
    '未有網，先記喺機度'
  )
  assert.equal(
    syncStatusText({ online: true, loggedIn: true, pending: 1 }),
    '同步去你帳戶'
  )
  assert.equal(
    syncStatusText({ online: true, loggedIn: false, pending: 0, note: '同步去你帳戶' }),
    null
  )
  assert.equal(
    syncStatusText({ online: true, loggedIn: true, pending: 0, note: '同步去你帳戶' }),
    '同步去你帳戶'
  )
})
