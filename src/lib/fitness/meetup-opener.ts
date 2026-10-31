/** 開台後廣東話開場白 — 可複製貼去開台 note／傾偈。 */

export type MeetupOpenerInput = {
  hostName: string
  gymName: string
  area: string
  focus: string
  slotLabel?: string
}

const FOCUS_LINE: Record<string, string> = {
  腿: '今日腿日，想一齊頂深蹲／RDL 都可以～',
  腿日: '今日腿日，想一齊頂深蹲／RDL 都可以～',
  推: '推日嚟啦，胸肩三頭有位就一齊～',
  拉: '拉日，背要醒——有人一齊就夾～',
  全身: '全身輕鬆開波，節奏自己控都得～',
  上半身: '上半身為主，機位有就一齊～',
  下半身: '下半身，膝同髖慢慢頂～',
  有氧: '有氧／卡路里為主，唔使死頂重量～',
}

function focusBlurb(focus: string) {
  const key = focus.trim()
  if (FOCUS_LINE[key]) return FOCUS_LINE[key]
  for (const [k, v] of Object.entries(FOCUS_LINE)) {
    if (key.includes(k)) return v
  }
  return `重點係「${key}」，大家自己跟感覺～`
}

/** 一組可貼嘅開場白（短） */
export function buildMeetupOpener(input: MeetupOpenerInput): string {
  const name = input.hostName.trim() || '師兄'
  const gym = input.gymName.trim() || 'gym'
  const area = input.area.trim() || '呢度'
  const slot = input.slotLabel?.trim()
  const lines = [
    `大家好，我係 ${name}～`,
    `喺 ${gym}（${area}）開咗台${slot ? ` · ${slot}` : ''}。`,
    focusBlurb(input.focus),
    '入到台打聲招呼就得，新手都歡迎 💪',
  ]
  return lines.join('\n')
}

/** 更短版本，適合 toast 預覽 */
export function meetupOpenerPreview(input: MeetupOpenerInput): string {
  const area = input.area.trim() || '呢度'
  const focus = input.focus.trim() || '全身'
  return `${area} · ${focus}——入台打聲招呼就得～`
}
