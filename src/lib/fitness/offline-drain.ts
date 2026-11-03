/** Copy when offline queue successfully flushes after reconnect. */

export function offlineDrainToastMessage(ok: number): string | null {
  if (ok <= 0) return null
  if (ok === 1) return '返咗線——離線嗰陣嗰 1 項，已經同步去你帳戶。'
  return `返咗線——離線嗰陣嗰 ${ok} 項，已經同步去你帳戶。`
}
