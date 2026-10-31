/** Soft open-gym / start-session nudge copy by time of day + streak. */

import { trainedToday } from './streaks'

export type GymNudge = {
  title: string
  body: string
  cta: string
  tone: 'accent' | 'warm' | 'calm'
} | null

export function getGymNudge(opts?: {
  hasActiveSession?: boolean
  streak?: number
  now?: Date
}): GymNudge {
  if (opts?.hasActiveSession) return null
  const now = opts?.now ?? new Date()
  if (trainedToday(now)) {
    return {
      title: '今日打咗卡 ✓',
      body: '做得好。想加多一場輕量都可以，唔想就收工休息。',
      cta: '再來一場',
      tone: 'calm',
    }
  }

  const h = now.getHours()
  const streak = opts?.streak ?? 0

  if (h >= 5 && h < 11) {
    return {
      title: '朝早開波？',
      body:
        streak > 0
          ? `連練 ${streak} 日——晨練人少機多，記組撳一下就得。`
          : '人少機多。開波之後上次重量會自動帶入。',
      cta: '開波',
      tone: 'accent',
    }
  }
  if (h >= 11 && h < 17) {
    return {
      title: '午間／晏晝空檔',
      body: '有 45 分鐘都夠推或拉。課表一掣開波，唔使慢慢填。',
      cta: '開波',
      tone: 'accent',
    }
  }
  if (h >= 17 && h < 22) {
    return {
      title: streak > 0 ? '夜晚班高峰前開？' : '放工爆機？',
      body:
        streak > 0
          ? `保持連練 ${streak} 日——高峰前去會順啲。`
          : '高峰前去會順啲。完場有分析同可分享卡。',
      cta: '開波',
      tone: 'warm',
    }
  }
  return {
    title: '夜深未練？',
    body: '唔勉強。想輕量就開一場；想訓就聽朝再嚟都得。',
    cta: '輕輕開波',
    tone: 'calm',
  }
}
