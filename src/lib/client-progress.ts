/** Client-only progress: welcome dismiss + lightweight achievements (localStorage). */

export const WELCOME_KEY = 'talktgtla-welcome-dismissed'
export const STATS_KEY = 'talktgtla-stats'
export const ACHIEVEMENTS_KEY = 'talktgtla-achievements'

export type Stats = {
  messagesSent: number
  repliesSent: number
  slangUsed: number
  emojiUsed: number
}

export type AchievementId =
  | 'first_message'
  | 'ten_messages'
  | 'first_reply'
  | 'slang_user'
  | 'emoji_user'

export type Achievement = {
  id: AchievementId
  title: string
  description: string
  emoji: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_message',
    title: '第一句話',
    description: '喺聊天室傳送咗第一則訊息',
    emoji: '👋',
  },
  {
    id: 'ten_messages',
    title: '傾咗 10 句',
    description: '一共傳送咗 10 則訊息',
    emoji: '💬',
  },
  {
    id: 'first_reply',
    title: '回覆達人',
    description: '第一次回覆咗人哋嘅訊息',
    emoji: '↩️',
  },
  {
    id: 'slang_user',
    title: '潮語達人',
    description: '用過潮語快速掣',
    emoji: '🗣️',
  },
  {
    id: 'emoji_user',
    title: '表情達人',
    description: '用過表情符號掣',
    emoji: '😊',
  },
]

const DEFAULT_STATS: Stats = {
  messagesSent: 0,
  repliesSent: 0,
  slangUsed: 0,
  emojiUsed: 0,
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function isWelcomeDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(WELCOME_KEY) === '1'
}

export function dismissWelcome(): void {
  localStorage.setItem(WELCOME_KEY, '1')
}

export function loadStats(): Stats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS }
  return { ...DEFAULT_STATS, ...safeParse<Partial<Stats>>(localStorage.getItem(STATS_KEY), {}) }
}

export function saveStats(stats: Stats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function loadUnlocked(): Set<AchievementId> {
  if (typeof window === 'undefined') return new Set()
  const list = safeParse<AchievementId[]>(localStorage.getItem(ACHIEVEMENTS_KEY), [])
  return new Set(list)
}

export function saveUnlocked(ids: Set<AchievementId>): void {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...ids]))
}

/** Check which achievements should unlock given current stats; returns newly unlocked ones. */
export function evaluateAchievements(
  stats: Stats,
  already: Set<AchievementId>
): AchievementId[] {
  const newly: AchievementId[] = []
  const tryUnlock = (id: AchievementId, ok: boolean) => {
    if (ok && !already.has(id)) newly.push(id)
  }
  tryUnlock('first_message', stats.messagesSent >= 1)
  tryUnlock('ten_messages', stats.messagesSent >= 10)
  tryUnlock('first_reply', stats.repliesSent >= 1)
  tryUnlock('slang_user', stats.slangUsed >= 1)
  tryUnlock('emoji_user', stats.emojiUsed >= 1)
  return newly
}

export function achievementById(id: AchievementId): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
