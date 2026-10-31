import type { Metadata, Viewport } from 'next'
import { Instrument_Serif } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const instrument = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Talk tgt la',
    template: '%s · Talk tgt la',
  },
  description: '香港人一齊傾偈 · 訓練 · 飲食',
}

export const viewport: Viewport = {
  themeColor: '#FAFAF9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-HK"
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
