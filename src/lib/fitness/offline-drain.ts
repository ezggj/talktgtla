/** Copy when offline queue successfully flushes after reconnect. */

export function offlineDrainToastMessage(ok: number): string | null {
  if (ok <= 0) return null
  if (ok === 1) return '返咗線——離線嗰陣嗰 1 項，而家上咗雲。'
  return `返咗線——離線嗰陣嗰 ${ok} 項，而家上咗雲。`
}
