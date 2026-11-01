/**
 * Obvious insults only — guest / quiet-room first paint.
 * Normal banter (大癲、頂、gym撚) stays. Directed abuse does not.
 */

const LATIN_SQUASH =
  /(?:fuck|fuq|fck|fku|stfu|motherfucker|asshole|bitch|cunt|dickhead|nigger|nigga|bullshit|shit)/

const PHRASE =
  /屌你|屌柒|屌鳩|仆街|仆你|冚家|臭閪|閪|你老母|戇鳩|屎忽|死全家|王八蛋|on9|dllm|\bdiu\b|\bf+[\W_]*u+[\W_]*c*[\W_]*k|\bf+[\W_*]*k+\b/i

export function isObviousInsult(raw: string): boolean {
  if (!raw) return false
  const s = raw.normalize('NFKC').toLowerCase()
  if (PHRASE.test(s)) return true
  const squashed = s.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '')
  return LATIN_SQUASH.test(squashed)
}
