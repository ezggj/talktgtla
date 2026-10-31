/** Client-side chat moderation helpers — local hide + report copy. */

const BLOCKED_KEY = 'talktgtla-chat-blocked-v1'

export type BlockedUser = {
  username: string
  blockedAt: string
}

function readBlocked(): BlockedUser[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BLOCKED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BlockedUser[]
    return Array.isArray(parsed) ? parsed.filter((x) => x?.username) : []
  } catch {
    return []
  }
}

function writeBlocked(list: BlockedUser[]) {
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

export function loadBlockedUsernames(): Set<string> {
  return new Set(readBlocked().map((b) => b.username.trim().toLowerCase()))
}

export function isUsernameBlocked(username: string, set?: Set<string>): boolean {
  const key = username.trim().toLowerCase()
  if (!key) return false
  const s = set ?? loadBlockedUsernames()
  return s.has(key)
}

export function blockUsername(username: string): Set<string> {
  const name = username.trim()
  if (!name) return loadBlockedUsernames()
  const list = readBlocked().filter((b) => b.username.toLowerCase() !== name.toLowerCase())
  list.unshift({ username: name, blockedAt: new Date().toISOString() })
  writeBlocked(list)
  return loadBlockedUsernames()
}

export function unblockUsername(username: string): Set<string> {
  const key = username.trim().toLowerCase()
  writeBlocked(readBlocked().filter((b) => b.username.toLowerCase() !== key))
  return loadBlockedUsernames()
}

export function listBlockedUsers(): BlockedUser[] {
  return readBlocked()
}

export const REPORT_REASONS = [
  { id: 'spam', label: '廣告／洗版' },
  { id: 'abuse', label: '侮辱／攻擊' },
  { id: 'nsfw', label: '色情／不雅' },
  { id: 'illegal', label: '疑似違法' },
  { id: 'other', label: '其他' },
] as const

export type ReportReasonId = (typeof REPORT_REASONS)[number]['id']

export function buildReportBody(opts: {
  reasonId: ReportReasonId
  reasonLabel: string
  username: string
  messageId: number
  snippet: string
}): string {
  const snip = opts.snippet.trim().slice(0, 280)
  return [
    `【傾偈舉報】${opts.reasonLabel}`,
    `對象花名：${opts.username || '（無名）'}`,
    `訊息 id：${opts.messageId}`,
    snip ? `內容摘錄：${snip}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
