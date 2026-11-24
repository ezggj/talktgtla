import assert from 'node:assert/strict'
import test from 'node:test'
import type { EmailOtpType } from '@supabase/supabase-js'
import { completeLogin, type LoginClient } from './complete-login'

function client(overrides: Partial<LoginClient> = {}): LoginClient & { codes: string[] } {
  const codes: string[] = []
  return {
    codes,
    exchangeCodeForSession: async (code) => {
      codes.push(code)
      return { error: null }
    },
    verifyOtp: async () => ({ error: null }),
    ...overrides,
  }
}

test('a confirm request with a code exchanges it and returns to the desk', async () => {
  const supabase = client()
  const location = await completeLogin('https://talktgtla.com/auth/confirm?code=google-code', supabase)
  assert.deepEqual(supabase.codes, ['google-code'])
  const url = new URL(location)
  assert.equal(url.pathname, '/')
  assert.equal(url.search, '')
})

test('the same code on the older callback path is exchanged too', async () => {
  const supabase = client()
  const location = await completeLogin('https://talktgtla.com/auth/callback?code=older-code', supabase)
  assert.deepEqual(supabase.codes, ['older-code'])
  assert.equal(new URL(location).pathname, '/')
})

test('a failed exchange redirects to the desk with an auth error', async () => {
  const supabase = client({
    exchangeCodeForSession: async (code) => {
      supabase.codes.push(code)
      return { error: { message: 'bad code' } }
    },
  })
  const location = await completeLogin('https://talktgtla.com/auth/confirm?code=nope', supabase)
  assert.deepEqual(supabase.codes, ['nope'])
  const url = new URL(location)
  assert.equal(url.pathname, '/')
  assert.equal(url.searchParams.get('auth'), 'error')
})

test('a confirm request without a code does not pretend the login worked', async () => {
  const supabase = client()
  const location = await completeLogin('https://talktgtla.com/auth/confirm', supabase)
  assert.deepEqual(supabase.codes, [])
  assert.equal(new URL(location).searchParams.get('auth'), 'error')
})

test('an email token that still arrives here is verified and then sent home', async () => {
  let seen: { type: EmailOtpType; token_hash: string } | null = null
  const location = await completeLogin('https://talktgtla.com/auth/confirm?token_hash=abc&type=email', {
    exchangeCodeForSession: async () => {
      throw new Error('no code to exchange')
    },
    verifyOtp: async (args) => {
      seen = args
      return { error: null }
    },
  })
  assert.deepEqual(seen, { type: 'email', token_hash: 'abc' })
  assert.equal(new URL(location).pathname, '/')
})
