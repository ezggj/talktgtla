import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: '試盤',
  description: '模擬盤，用虛擬資金練習買賣。唔係真錢，唔使登入。',
  applicationName: '試盤',
  metadataBase: new URL('https://talktgtla.com'),
  openGraph: {
    title: '試盤',
    description: '模擬盤，用虛擬資金。唔係真錢交易。',
    url: 'https://talktgtla.com',
    siteName: '試盤',
    locale: 'zh_HK',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '試盤' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '試盤',
    description: '模擬盤，用虛擬資金。唔係真錢交易。',
    images: ['/og.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '試盤',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#10242c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK" className={GeistSans.variable}>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  )
}
