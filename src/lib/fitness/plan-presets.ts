/** Ready-made weekly plans — Cantonese, newbie-friendly. */

import type { GeneratedPlan, PlanDay, PlanExercise } from './plan-generator'

const DAY = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

function ex(id: string, nameZh: string, sets: number, reps: string, restSec = 90): PlanExercise {
  return { exerciseId: id, nameZh, sets, reps, restSec }
}

function day(dayIndex: number, focus: string, exercises: PlanExercise[]): PlanDay {
  return { dayIndex, nameZh: DAY[dayIndex], focus, exercises }
}

export type PlanPreset = {
  id: string
  badge: string
  newbie?: boolean
  blurb: string
  plan: GeneratedPlan
}

/** 推拉腿 ×2 · 一週六練 */
const PPL_6: GeneratedPlan = {
  title: '推拉腿 ×2 · 一週六練',
  split: '推拉腿 ×2',
  summary: '經典 PPL：推／拉／腿輪兩輪。適合已有底、想進步嘅人；每次約 60 分。',
  days: [
    day(0, '推', [
      ex('bench', '卧推', 4, '8–12'),
      ex('incline-bench', '上斜卧推', 3, '8–12'),
      ex('ohp', '肩推', 3, '8–12'),
      ex('lateral', '側平舉', 3, '12–15', 60),
      ex('tricep', '三頭下壓', 3, '10–15', 60),
    ]),
    day(1, '拉', [
      ex('deadlift', '硬拉', 3, '5–8', 120),
      ex('row', '划船', 4, '8–12'),
      ex('latpulldown', '高拉', 3, '8–12'),
      ex('face-pull', '面拉', 3, '12–15', 60),
      ex('curl', '二頭彎舉', 3, '10–15', 60),
    ]),
    day(2, '腿', [
      ex('squat', '深蹲', 4, '6–10', 120),
      ex('rdl', '羅馬尼亞硬拉', 3, '8–12'),
      ex('bulgarian-split', '保加利亞分腿蹲', 3, '8–12／邊'),
      ex('leg-curl', '腿彎舉', 3, '10–15', 60),
      ex('calf', '提踵', 4, '12–20', 45),
    ]),
    day(3, '推', [
      ex('ohp', '肩推', 4, '6–10'),
      ex('dumbbell-press', '啞鈴卧推', 3, '8–12'),
      ex('fly', '飛鳥', 3, '12–15', 60),
      ex('cable-lateral', '繩索側平舉', 3, '12–15', 60),
      ex('overhead-tricep', '過頭三頭伸展', 3, '10–15', 60),
    ]),
    day(4, '拉', [
      ex('pullup', '引體上升', 4, '盡量'),
      ex('seated-row', '坐姿划船', 3, '8–12'),
      ex('t-bar-row', 'T 槓划船', 3, '8–12'),
      ex('rear-delt', '後束飛鳥', 3, '12–15', 60),
      ex('hammer-curl', '錘式彎舉', 3, '10–15', 60),
    ]),
    day(5, '腿', [
      ex('legpress', '腿舉', 4, '10–15'),
      ex('hack-squat', '哈克深蹲', 3, '8–12'),
      ex('hipthrust', '臀推', 3, '8–12'),
      ex('lunges', '弓步蹲', 3, '10／邊'),
      ex('seated-calf', '坐姿提踵', 4, '12–20', 45),
    ]),
  ],
}

/** 新手推拉腿 · 一週三練（輕） */
const NEWBIE_PPL_3: GeneratedPlan = {
  title: '新手推拉腿 · 一週三練',
  split: '推拉腿（輕）',
  summary: '第一次跟 PPL：器械為主，唔使驚自由重量。一、三、五練，其餘休息或輕行。',
  days: [
    day(0, '推（輕）', [
      ex('chest-press-machine', '胸推機', 3, '10–12'),
      ex('db-shoulder-press', '啞鈴肩推', 3, '10–12'),
      ex('pec-deck', '夾胸機', 3, '12–15', 60),
      ex('lat-raise-machine', '側平舉機', 3, '12–15', 60),
      ex('tricep', '三頭下壓', 3, '12–15', 60),
    ]),
    day(2, '拉（輕）', [
      ex('latpulldown', '高拉', 3, '10–12'),
      ex('seated-row', '坐姿划船', 3, '10–12'),
      ex('face-pull', '面拉', 3, '12–15', 60),
      ex('curl', '二頭彎舉', 3, '12–15', 60),
      ex('plank', '平板支撐', 3, '30–45秒', 45),
    ]),
    day(4, '腿（輕）', [
      ex('goblet-squat', '高腳杯深蹲', 3, '10–12'),
      ex('legpress', '腿舉', 3, '10–15'),
      ex('rdl', '羅馬尼亞硬拉', 3, '10–12'),
      ex('leg-curl', '腿彎舉', 3, '12–15', 60),
      ex('calf', '提踵', 3, '15–20', 45),
    ]),
  ],
}

/** 新手全身 ×3 */
const NEWBIE_FULL_3: GeneratedPlan = {
  title: '新手全身 · 一週三練',
  split: '全身 ×3',
  summary: '最穩陣打底：一、三、五各做一堂全身，學動作同養成習慣。',
  days: [
    day(0, '全身 A', [
      ex('goblet-squat', '高腳杯深蹲', 3, '10–12'),
      ex('pushup', '掌上壓', 3, '盡量'),
      ex('seated-row', '坐姿划船', 3, '10–12'),
      ex('db-shoulder-press', '啞鈴肩推', 3, '10–12'),
      ex('plank', '平板支撐', 3, '30–45秒', 45),
    ]),
    day(2, '全身 B', [
      ex('legpress', '腿舉', 3, '10–15'),
      ex('chest-press-machine', '胸推機', 3, '10–12'),
      ex('latpulldown', '高拉', 3, '10–12'),
      ex('hipthrust', '臀推', 3, '10–12'),
      ex('crunch', '捲腹', 3, '12–15', 45),
    ]),
    day(4, '全身 C', [
      ex('rdl', '羅馬尼亞硬拉', 3, '10–12'),
      ex('dumbbell-press', '啞鈴卧推', 3, '10–12'),
      ex('dumbbell-row', '單臂划船', 3, '10／邊'),
      ex('lunges', '弓步蹲', 3, '10／邊'),
      ex('plank', '平板支撐', 3, '30–60秒', 45),
    ]),
  ],
}

/** 上下身 · 一週四練 */
const UPPER_LOWER_4: GeneratedPlan = {
  title: '上下身 · 一週四練',
  split: '上下身',
  summary: '一／四上身、二／五下身。時間唔夠六日 PPL 就用呢套。',
  days: [
    day(0, '上身', [
      ex('bench', '卧推', 4, '8–12'),
      ex('row', '划船', 4, '8–12'),
      ex('ohp', '肩推', 3, '8–12'),
      ex('latpulldown', '高拉', 3, '8–12'),
      ex('curl', '二頭彎舉', 3, '10–15', 60),
      ex('tricep', '三頭下壓', 3, '10–15', 60),
    ]),
    day(1, '下身', [
      ex('squat', '深蹲', 4, '6–10', 120),
      ex('rdl', '羅馬尼亞硬拉', 3, '8–12'),
      ex('legpress', '腿舉', 3, '10–15'),
      ex('hipthrust', '臀推', 3, '8–12'),
      ex('calf', '提踵', 4, '12–20', 45),
    ]),
    day(3, '上身', [
      ex('incline-bench', '上斜卧推', 4, '8–12'),
      ex('seated-row', '坐姿划船', 4, '8–12'),
      ex('db-shoulder-press', '啞鈴肩推', 3, '8–12'),
      ex('pullup', '引體上升', 3, '盡量'),
      ex('lateral', '側平舉', 3, '12–15', 60),
      ex('face-pull', '面拉', 3, '12–15', 60),
    ]),
    day(4, '下身', [
      ex('bulgarian-split', '保加利亞分腿蹲', 3, '8–12／邊'),
      ex('hack-squat', '哈克深蹲', 3, '8–12'),
      ex('leg-curl', '腿彎舉', 3, '10–15', 60),
      ex('leg-extension', '腿伸展', 3, '12–15', 60),
      ex('seated-calf', '坐姿提踵', 4, '12–20', 45),
    ]),
  ],
}

/** 腿日加強週 · 一週四練（兩腿兩上） */
const LEG_FOCUS: GeneratedPlan = {
  title: '腿日加強 · 一週四練',
  split: '腿＋上',
  summary: 'Threads 成日問 leg day：一／四腿、二／五上。內有 RDL、保加利亞，每動作可睇「點做」。',
  days: [
    day(0, '腿 A', [
      ex('squat', '深蹲', 4, '6–10', 120),
      ex('rdl', '羅馬尼亞硬拉', 3, '8–12'),
      ex('bulgarian-split', '保加利亞分腿蹲', 3, '8–12／邊'),
      ex('leg-curl', '腿彎舉', 3, '10–15', 60),
      ex('calf', '提踵', 4, '12–20', 45),
    ]),
    day(1, '上身', [
      ex('bench', '卧推', 4, '8–12'),
      ex('row', '划船', 4, '8–12'),
      ex('ohp', '肩推', 3, '8–12'),
      ex('latpulldown', '高拉', 3, '8–12'),
      ex('curl', '二頭彎舉', 3, '10–15', 60),
    ]),
    day(3, '腿 B', [
      ex('goblet-squat', '高腳杯深蹲', 3, '10–12'),
      ex('legpress', '腿舉', 4, '10–15'),
      ex('hipthrust', '臀推', 3, '8–12'),
      ex('lunges', '弓步蹲', 3, '10／邊'),
      ex('seated-calf', '坐姿提踵', 4, '15–20', 45),
    ]),
    day(4, '上身', [
      ex('dumbbell-press', '啞鈴卧推', 3, '8–12'),
      ex('seated-row', '坐姿划船', 3, '8–12'),
      ex('lateral', '側平舉', 3, '12–15', 60),
      ex('face-pull', '面拉', 3, '12–15', 60),
      ex('tricep', '三頭下壓', 3, '10–15', 60),
    ]),
  ],
}

/** 忙碌兩日全身 */
const BUSY_2: GeneratedPlan = {
  title: '忙碌兩日 · 全身',
  split: '全身 ×2',
  summary: '一週只得兩日？一同四各做一堂全身，動作精簡。',
  days: [
    day(0, '全身', [
      ex('squat', '深蹲', 3, '8–12'),
      ex('bench', '卧推', 3, '8–12'),
      ex('row', '划船', 3, '8–12'),
      ex('rdl', '羅馬尼亞硬拉', 3, '8–12'),
      ex('plank', '平板支撐', 3, '30–60秒', 45),
    ]),
    day(3, '全身', [
      ex('legpress', '腿舉', 3, '10–15'),
      ex('ohp', '肩推', 3, '8–12'),
      ex('latpulldown', '高拉', 3, '8–12'),
      ex('hipthrust', '臀推', 3, '8–12'),
      ex('pushup', '掌上壓', 3, '盡量'),
    ]),
  ],
}

export const WEEKLY_PRESETS: PlanPreset[] = [
  {
    id: 'newbie-full-3',
    badge: '新手',
    newbie: true,
    blurb: '打底養成習慣',
    plan: NEWBIE_FULL_3,
  },
  {
    id: 'newbie-ppl-3',
    badge: '新手',
    newbie: true,
    blurb: '第一次跟推拉腿',
    plan: NEWBIE_PPL_3,
  },
  {
    id: 'leg-focus-4',
    badge: '腿日',
    newbie: true,
    blurb: 'RDL＋保加利亞',
    plan: LEG_FOCUS,
  },
  {
    id: 'upper-lower-4',
    badge: '上下',
    blurb: '四日夠晒',
    plan: UPPER_LOWER_4,
  },
  {
    id: 'ppl-6',
    badge: 'PPL',
    blurb: '經典六日輪',
    plan: PPL_6,
  },
  {
    id: 'busy-2',
    badge: '忙碌',
    blurb: '一週兩日都得',
    plan: BUSY_2,
  },
]

export function presetById(id: string): PlanPreset | undefined {
  return WEEKLY_PRESETS.find((p) => p.id === id)
}
