import { Suspense } from 'react'
import { LoginClient } from './login-client'

export const metadata = {
  title: '登入',
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background p-6">
          <div className="max-w-lg mx-auto h-40 rounded-[20px] bg-border/50 skeleton-pulse" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  )
}
