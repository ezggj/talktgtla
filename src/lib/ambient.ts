export type AmbientResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  online?: number
  recentHumans?: number
  recentBots?: number
  posted?: unknown
  second?: unknown
  error?: string
}

/** Ambient bots disabled — chat room is humans only. */
export async function runAmbientBots(): Promise<AmbientResult> {
  return { ok: true, skipped: true, reason: 'bots_disabled' }
}
