export {
  EXERCISES,
  GENERIC_CUES,
  NEWBIE_SEARCH_CHIPS,
  exerciseById,
  searchExercises,
  matchedAliasLabel,
  resolveExerciseGuide,
  type ExerciseGuide,
} from '@/lib/exercises/library'

/** @deprecated Prefer ExerciseGuide — kept for older imports */
export type Exercise = {
  id: string
  nameZh: string
  nameEn: string
  aliases: string[]
  muscle: string
}

export type Template = {
  id: string
  name: string
  desc: string
  exerciseIds: string[]
  /** Highlight for Threads / gym newbies */
  newbie?: boolean
  /** Short badge on card, e.g. 新手 / PPL */
  badge?: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'newbie-leg-day',
    name: '新手腿日',
    desc: 'Threads 成日問嘅 leg day：深蹲／RDL／保加利亞＋腿機，每動作可睇「點做」',
    exerciseIds: ['goblet-squat', 'legpress', 'rdl', 'bulgarian-split', 'leg-curl', 'calf'],
    newbie: true,
    badge: '新手',
  },
  {
    id: 'ppl-push',
    name: '推日',
    desc: '胸肩三頭 · 推拉腿（PPL）推日',
    exerciseIds: ['bench', 'incline-bench', 'ohp', 'fly', 'lateral', 'tricep'],
    badge: 'PPL',
  },
  {
    id: 'ppl-pull',
    name: '拉日',
    desc: '背二頭 · 推拉腿（PPL）拉日；有硬拉／划船',
    exerciseIds: ['deadlift', 'row', 'latpulldown', 'pullup', 'face-pull', 'curl'],
    badge: 'PPL',
  },
  {
    id: 'ppl-legs',
    name: '腿日',
    desc: '深蹲臀腿 · 經典 PPL 腿日（含 RDL、保加利亞）',
    exerciseIds: ['squat', 'legpress', 'rdl', 'bulgarian-split', 'lunges', 'calf'],
    badge: 'PPL',
  },
  {
    id: 'newbie-ppl-starter',
    name: '新手推拉腿（輕）',
    desc: '第一次跟推拉腿：器械為主，少怕自由重量',
    exerciseIds: ['chest-press-machine', 'seated-row', 'legpress', 'db-shoulder-press', 'latpulldown', 'goblet-squat'],
    newbie: true,
    badge: '新手',
  },
  {
    id: 'fullbody',
    name: '全身',
    desc: '新手友善 · 一次搞掂',
    exerciseIds: ['goblet-squat', 'pushup', 'seated-row', 'db-shoulder-press', 'plank'],
    newbie: true,
    badge: '新手',
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
    desc: '五五分 · 下（深蹲＋RDL＋臀推）',
    exerciseIds: ['squat', 'rdl', 'legpress', 'hipthrust', 'calf'],
  },
]

/** Featured on Today idle — one-tap 開波 for confused newbies */
export const NEWBIE_QUICK_TEMPLATES = TEMPLATES.filter((t) =>
  ['newbie-leg-day', 'ppl-push', 'ppl-pull', 'ppl-legs', 'newbie-ppl-starter'].includes(t.id)
)
