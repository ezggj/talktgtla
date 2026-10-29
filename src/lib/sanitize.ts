/** Shared input sanitizer — client UX + server enforcement. */

export const MAX_CONTENT_LENGTH = 500
export const MAX_USERNAME_LENGTH = 24

export type SanitizeOk = { ok: true; value: string }
export type SanitizeErr = { ok: false; error: string }
export type SanitizeResult = SanitizeOk | SanitizeErr

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

function looksDangerous(input: string): boolean {
  return (
    /javascript\s*:/i.test(input) ||
    /data\s*:\s*text\/html/i.test(input) ||
    /on\w+\s*=/i.test(input) ||
    /<\s*script/i.test(input) ||
    /<\s*iframe/i.test(input) ||
    /<\s*object/i.test(input) ||
    /<\s*embed/i.test(input)
  )
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizeUsername(raw: unknown): SanitizeResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: '暱稱唔啱格式' }
  }
  let s = raw.normalize('NFKC').replace(/\0/g, '')
  if (looksDangerous(s) || /<[^>]*>/.test(s)) {
    return { ok: false, error: '暱稱唔可以有奇怪嘅字元' }
  }
  s = stripHtml(s)
  s = s.replace(/\s+/g, ' ').trim()
  if (!s) return { ok: false, error: '請寫個暱稱，或者揀匿名' }
  if (s.length > MAX_USERNAME_LENGTH) {
    return { ok: false, error: `暱稱太長喇，最多 ${MAX_USERNAME_LENGTH} 個字` }
  }
  return { ok: true, value: s }
}

export function sanitizeContent(raw: unknown): SanitizeResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: '訊息唔啱格式' }
  }
  let s = raw.normalize('NFKC').replace(/\0/g, '')
  if (looksDangerous(s)) {
    return { ok: false, error: '內容唔妥當，唔好貼奇怪嘅 code' }
  }
  s = stripHtml(s)
  if (looksDangerous(s) || /<[^>]*>/.test(s)) {
    return { ok: false, error: '內容唔妥當，唔好貼 HTML' }
  }
  s = normalizeWhitespace(s)
  if (!s) return { ok: false, error: '訊息唔可以空白' }
  if (s.length > MAX_CONTENT_LENGTH) {
    return { ok: false, error: `訊息太長喇，最多 ${MAX_CONTENT_LENGTH} 個字` }
  }
  return { ok: true, value: s }
}
