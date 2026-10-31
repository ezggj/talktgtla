export type Exercise = {
  id: string
  nameZh: string
  nameEn: string
  aliases: string[]
  muscle: string
}

export const EXERCISES: Exercise[] = [
  { id: 'bench', nameZh: '卧推', nameEn: 'Bench Press', aliases: ['bench', '胸', '卧推'], muscle: '胸' },
  { id: 'squat', nameZh: '深蹲', nameEn: 'Squat', aliases: ['squat', '腿', '深蹲'], muscle: '腿' },
  { id: 'deadlift', nameZh: '硬拉', nameEn: 'Deadlift', aliases: ['deadlift', '背', '硬拉'], muscle: '背' },
  { id: 'ohp', nameZh: '肩推', nameEn: 'Overhead Press', aliases: ['ohp', '肩', '推舉'], muscle: '肩' },
  { id: 'row', nameZh: '划船', nameEn: 'Barbell Row', aliases: ['row', '划船', '背'], muscle: '背' },
  { id: 'pullup', nameZh: '引體上升', nameEn: 'Pull-up', aliases: ['pullup', '引體', '背'], muscle: '背' },
  { id: 'latpulldown', nameZh: '高拉', nameEn: 'Lat Pulldown', aliases: ['高拉', 'lat'], muscle: '背' },
  { id: 'legpress', nameZh: '腿舉', nameEn: 'Leg Press', aliases: ['腿舉', 'leg press'], muscle: '腿' },
  { id: 'rdl', nameZh: '羅馬尼亞硬拉', nameEn: 'RDL', aliases: ['rdl', '羅馬'], muscle: '腿' },
  { id: 'lunges', nameZh: '弓步蹲', nameEn: 'Lunges', aliases: ['弓步', 'lunge'], muscle: '腿' },
  { id: 'curl', nameZh: '二頭彎舉', nameEn: 'Bicep Curl', aliases: ['二頭', '手臂', 'curl'], muscle: '手臂' },
  { id: 'tricep', nameZh: '三頭下壓', nameEn: 'Tricep Pushdown', aliases: ['三頭', '手臂'], muscle: '手臂' },
  { id: 'lateral', nameZh: '側平舉', nameEn: 'Lateral Raise', aliases: ['側平舉', '肩'], muscle: '肩' },
  { id: 'fly', nameZh: '飛鳥', nameEn: 'Cable Fly', aliases: ['飛鳥', '胸'], muscle: '胸' },
  { id: 'hipthrust', nameZh: '臀推', nameEn: 'Hip Thrust', aliases: ['臀推', '臀'], muscle: '臀' },
  { id: 'calf', nameZh: '提踵', nameEn: 'Calf Raise', aliases: ['小腿', '提踵'], muscle: '腿' },
  { id: 'plank', nameZh: '平板支撐', nameEn: 'Plank', aliases: ['平板', 'core'], muscle: '核心' },
  { id: 'crunch', nameZh: '捲腹', nameEn: 'Crunch', aliases: ['捲腹', '腹'], muscle: '核心' },
]

export type Template = {
  id: string
  name: string
  desc: string
  exerciseIds: string[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'ppl-push',
    name: '推日',
    desc: '胸肩三頭 · 經典 PPL',
    exerciseIds: ['bench', 'ohp', 'fly', 'lateral', 'tricep'],
  },
  {
    id: 'ppl-pull',
    name: '拉日',
    desc: '背二頭 · 經典 PPL',
    exerciseIds: ['deadlift', 'row', 'latpulldown', 'pullup', 'curl'],
  },
  {
    id: 'ppl-legs',
    name: '腿日',
    desc: '深蹲臀腿 · 經典 PPL',
    exerciseIds: ['squat', 'legpress', 'rdl', 'lunges', 'calf'],
  },
  {
    id: 'fullbody',
    name: '全身',
    desc: '新手友善 · 一次搞掂',
    exerciseIds: ['squat', 'bench', 'row', 'ohp', 'plank'],
  },
  {
    id: 'upper',
    name: '上身',
    desc: '五五分 · 上',
    exerciseIds: ['bench', 'row', 'ohp', 'latpulldown', 'curl', 'tricep'],
  },
  {
    id: 'lower',
    name: '下身',
    desc: '五五分 · 下',
    exerciseIds: ['squat', 'rdl', 'legpress', 'hipthrust', 'calf'],
  },
]

export function searchExercises(q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return EXERCISES
  return EXERCISES.filter(
    (e) =>
      e.nameZh.includes(s) ||
      e.nameEn.toLowerCase().includes(s) ||
      e.aliases.some((a) => a.toLowerCase().includes(s)) ||
      e.muscle.includes(s)
  )
}

export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id)
}
