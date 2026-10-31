/** Lightweight Cantonese starter chips — 分店／部位／日常，插入輸入框。 */

export type StarterChip = {
  id: string
  label: string
  text: string
}

export const CHAT_STARTER_CHIPS: StarterChip[] = [
  { id: 'leg', label: '🦵 腿日', text: '今日腿日，有冇人一齊頂？' },
  { id: 'push', label: '💪 推日', text: '推日嚟啦，胸肩有位嗎？' },
  { id: 'pull', label: '🏋️ 拉日', text: '拉日，背要醒——邊個喺場？' },
  { id: 'mk', label: '📍 旺角247', text: '有冇人喺旺角 247？人多唔多？' },
  { id: 'cwb', label: '📍 銅鑼灣', text: '銅鑼灣邊間而家鬆啲？' },
  { id: 'protein', label: '🍗 蛋白', text: '今日蛋白靠咩？茶記定便當？' },
  { id: 'pr', label: '📈 PR', text: '最近有冇細 PR？講嚟聽下～' },
  { id: 'rest', label: '😴 休息日', text: '今日休息日，大家都點過？' },
  { id: 'newbie', label: '🌱 新手', text: '新手嚟問：腿日第一日點排好？' },
  { id: 'meetup', label: '🤝 凑局', text: '想開台凑局，邊個時段啱？' },
]
