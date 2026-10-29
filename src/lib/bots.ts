/** Ambient bot personas — SFW colloquial Cantonese banter. */

export const BOT_MARKER = '🤖'

export type BotPersona = {
  /** Display name WITHOUT marker; marker added by RPC/UI */
  name: string
  lines: string[]
}

/** ~15 light HK chat personas */
export const BOT_PERSONAS: BotPersona[] = [
  {
    name: '阿強',
    lines: [
      '喂師兄，食咗未呀',
      '今日好熱呀真係',
      '哈哈哈係囉',
      '有冇人喺度傾下',
      '我啱啱收工',
    ],
  },
  {
    name: '師姐',
    lines: [
      '大家好呀～',
      '今晚食咩好呢',
      '笑死我',
      '真係大癲',
      '沖涼先，一陣再上',
    ],
  },
  {
    name: '肥仔',
    lines: [
      '肚餓到震',
      '想食魚蛋粉',
      '邊個請我飲茶',
      '喂唔好嘈我瞓緊',
      '哈哈哈你講笑',
    ],
  },
  {
    name: '小明',
    lines: [
      '返學好攰',
      '有冇人一齊傾',
      '咁夜未瞓？',
      '早晨呀各位',
      '明日又要早起',
    ],
  },
  {
    name: '阿花',
    lines: [
      '天氣轉涼記得添衫',
      '我睇緊劇',
      '邊套劇好睇呀',
      '哈哈你又嚟',
      '晚安啦各位',
    ],
  },
  {
    name: '阿Dee',
    lines: [
      '大癲呀呢單嘢',
      '師兄有料到',
      '不如出街行下',
      '塞車塞到悶',
      '到屋企先傾',
    ],
  },
  {
    name: 'Kitty',
    lines: [
      '萌爆了',
      '今日心情不錯',
      '有冇人鍾意貓',
      '嘻嘻',
      '我去倒杯水',
    ],
  },
  {
    name: '阿輝',
    lines: [
      '收工收工',
      '聽日放假咩',
      '想去行山',
      '邊度景靚呀',
      '你哋呢',
    ],
  },
  {
    name: '阿May',
    lines: [
      '加油呀各位',
      '慢慢嚟唔使急',
      '哈哈係呀',
      '我都覺得',
      '傾得幾開心',
    ],
  },
  {
    name: '阿Ben',
    lines: [
      '打機先',
      '有冇人一齊',
      '輸到燶',
      '再來一鋪',
      '你哋玩緊咩',
    ],
  },
  {
    name: '阿玲',
    lines: [
      '飲咗未呀茶',
      '想食甜品',
      '邊間好食推介下',
      '哈哈哈真係',
      '我出門口先',
    ],
  },
  {
    name: '阿傑',
    lines: [
      '搭車好擠',
      '終於坐到位',
      '聽日見',
      '喂醒未呀',
      '好夜喇大家',
    ],
  },
  {
    name: 'Candy',
    lines: [
      '早晨早晨',
      '週末有咩計劃',
      '我想瞓多陣',
      '笑死',
      '傾下先',
    ],
  },
  {
    name: '阿東',
    lines: [
      '睇波未',
      '今晚有冇得睇',
      '勁呀',
      '可惜咗',
      '下次再嚟',
    ],
  },
  {
    name: '阿詩',
    lines: [
      '聽歌中',
      '推介首歌畀我吖',
      '呢首好聽',
      '嗯嗯',
      '我去忙一陣',
    ],
  },
]

export const BOT_REPLIES = [
  '係呀係呀',
  '哈哈哈',
  '真係咩',
  '我都覺得',
  '笑死',
  '大癲',
  '得啦得啦',
  '明白',
  '好呀',
  '不如吖',
  '你講得啱',
  '頂你呀',
  '哈哈師兄',
  '嗯嗯',
  '咁夜仲喺度',
]

export function isBotUsername(username: string): boolean {
  return username.includes(BOT_MARKER) || username.startsWith('[Bot]')
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function pickPersona(excludeName?: string): BotPersona {
  const pool = excludeName
    ? BOT_PERSONAS.filter((p) => p.name !== excludeName)
    : BOT_PERSONAS
  return pick(pool.length ? pool : BOT_PERSONAS)
}
