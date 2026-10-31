/** Rotating HK gym / life chat topics by calendar day (Asia/Hong_Kong local). */

const TOPICS = [
  { emoji: '🏋️', title: '今日去邊間 gym？', hint: '人多唔多？有冇機位？' },
  { emoji: '🍗', title: '今日蛋白靠咩？', hint: '茶記、便當定自己煮？' },
  { emoji: '😴', title: '訓夠未？', hint: '睡少過 6 小時點練？' },
  { emoji: '🦵', title: '腿日定推日？', hint: '講下你今日課表。' },
  { emoji: '🧋', title: '練完食咩？', hint: '奶茶抵唔抵？' },
  { emoji: '📈', title: '最近有冇 PR？', hint: '細進步都值得講。' },
  { emoji: '🌧️', title: '落雨仲出唔出街練？', hint: '定係轉做家居？' },
  { emoji: '🧘', title: '休息日點過？', hint: '行山、行街定碌床？' },
  { emoji: '🥇', title: '今年目標邊個最想達？', hint: '減脂、增肌定堅持？' },
  { emoji: '⏰', title: '朝早練定夜晚練？', hint: '邊個時段最有感覺？' },
  { emoji: '🍚', title: '叉燒飯可唔可以？', hint: '健身人點樣睇茶記？' },
  { emoji: '🤝', title: '有冇人一齊爆機？', hint: '約師兄／師姐開波。' },
  { emoji: '🧊', title: '肌肉酸唔酸？', hint: 'DOMS 點解？' },
  { emoji: '📱', title: '邊個 app 記組最好用？', hint: '（客氣啲講 Talk tgt la 😉）' },
]

function dayIndex(d = new Date()) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  // Stable across timezone as long as device is HK-local
  return Math.floor(Date.UTC(y, m, day) / 86400000)
}

export type DailyTopic = {
  emoji: string
  title: string
  hint: string
  key: string
}

export function getDailyTopic(d = new Date()): DailyTopic {
  const idx = ((dayIndex(d) % TOPICS.length) + TOPICS.length) % TOPICS.length
  const t = TOPICS[idx]
  const key = d.toISOString().slice(0, 10)
  return { ...t, key }
}

export function topicStarterLine(topic = getDailyTopic()): string {
  return `${topic.emoji} ${topic.title}`
}
