import type { EmailOtpType } from '@supabase/supabase-js'

const OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

export interface LoginClient {
  exchangeCodeForSession(code: string): Promise<{ error: { message?: string } | null }>
  verifyOtp(args: { type: EmailOtpType; token_hash: string }): Promise<{ error: { message?: string } | null }>
}

/** Turn a Supabase redirect into a desk URL. Success always lands on /, never the old /me page. */
export async function completeLogin(requestUrl: string, client: LoginClient): Promise<string> {
  const url = new URL(requestUrl)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const home = new URL('/', url.origin)

  if (code) {
    const { error } = await client.exchangeCodeForSession(code)
    if (!error) return home.toString()
  }

  if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
    const { error } = await client.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })
    if (!error) return home.toString()
  }

  home.searchParams.set('auth', 'error')
  return home.toString()
}
