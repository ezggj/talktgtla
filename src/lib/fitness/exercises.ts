export {
  EXERCISES,
  GENERIC_CUES,
  exerciseById,
  searchExercises,
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
