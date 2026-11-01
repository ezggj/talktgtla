/** Short offline / sync copy. Shown next to train and eat saves. */

export function syncStatusText(opts: {
  online: boolean
  loggedIn: boolean
  pending: number
  note?: string | null
}): string | null {
  if (!opts.online) return '未有網，先記喺機度'
  if (!opts.loggedIn) return null
  if (opts.note && /同步唔到/.test(opts.note)) return '同步唔到，先記喺機度'
  if (opts.pending > 0) return '同步去你帳戶'
  if (opts.note && /同步去你/.test(opts.note)) return '同步去你帳戶'
  return null
}
